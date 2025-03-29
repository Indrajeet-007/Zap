import { saveAs } from "file-saver";
import JSZip from "jszip";
import { ArrowUpFromLine, Copy, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { socket } from "../lib/socket";
import { ConnectionStatus } from "./ConnectionStatus";
import { DeviceConnection } from "./DeviceConnection";
import { DeviceRadarWrapper } from "./DeviceRadarWrapper";
import { FileInputs } from "./FileInputs";
import { FileList } from "./FileList";
import { ProgressBars } from "./ProgressBars";
import { ReceivedFiles } from "./ReceivedFiles";
import { RecipientList } from "./RecipientList";
import { TransferLogPanel } from "./TransferLogPanel";
const connectURL = import.meta.env.VITE_CONNECT_URL;

interface TransferLog {
  id: string;
  timestamp: Date;
  type: "sent" | "received";
  fileName: string;
  fileSize: string;
  status: "completed" | "failed" | "in-progress";
  transferTime?: string;
  transferSpeed?: string;
  path?: string;
  recipients?: string[];
}

interface ReceivedFile {
  name: string;
  file: string;
  size: number;
  receivedAt: Date;
  path?: string;
}

interface SelectedFile {
  file: File;
  path: string;
  relativePath: string;
}

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [userid, setuserid] = useState("");
  const [transferSpeed, setTransferSpeed] = useState<{ [key: string]: string }>(
    {},
  );
  const [showQrCode, setShowQrCode] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [transferLogs, setTransferLogs] = useState<TransferLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  interface FileChunks {
    [key: string]: {
      name: string;
      chunks: Uint8Array[];
      size: number;
      startedAt: number;
      path?: string;
    };
  }

  const fileChunks = useRef<FileChunks>({});
  const speedCalculations = useRef<{
    [key: string]: { lastTime: number; lastLoaded: number };
  }>({});

  interface User {
    id: string;
    socketId: string;
    isMobile: boolean;
  }
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);

  useEffect(() => {
    if (userid || isConnected || !socket.id) return;
    let userId = localStorage.getItem("userId");
    if (!userId) {
      localStorage.setItem("userId", socket.id!);
      userId = socket.id!;
    }
    console.log("✅ Registered:", userId);
    setIsConnected(true);
    socket.emit("register", { userId });
    if (socket.id) setuserid(userId);
  }, [userid, isConnected]);

  useEffect(() => {
    const savedLogs = localStorage.getItem("fileTransferLogs");
    if (savedLogs) {
      try {
        const parsedLogs = JSON.parse(savedLogs, (key, value) => {
          if (key === "timestamp") return new Date(value);
          return value;
        });
        setTransferLogs(parsedLogs);
      } catch (e) {
        console.error("Failed to parse logs from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    if (transferLogs.length > 0) {
      localStorage.setItem("fileTransferLogs", JSON.stringify(transferLogs));
    }
  }, [transferLogs]);

  // Clear logs when user ID changes
  useEffect(() => {
    if (userid) {
      setTransferLogs([]);
      localStorage.removeItem("fileTransferLogs");
    }
  }, [userid]);

  const clearTransferLogs = () => {
    setTransferLogs([]);
    localStorage.removeItem("fileTransferLogs");
  };

  const addTransferLog = (log: Omit<TransferLog, "id" | "timestamp">) => {
    const newLog: TransferLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...log,
    };
    setTransferLogs((prev) => [newLog, ...prev].slice(0, 100));
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connectTo = urlParams.get("connect");

    if (connectTo && connectTo !== userid) {
      if (!recipientIds.includes(connectTo)) {
        setRecipientIds((prev) => [...prev, connectTo]);
      }
      window.history.replaceState(null, "", "/home");
    }

    const onConnect = () => {
      setIsConnected(true);
      let userId = localStorage.getItem("userId");
      if (!userId) {
        localStorage.setItem("userId", socket.id!);
        userId = socket.id!;
      }
      socket.emit("register", { userId });
      if (socket.id) setuserid(userId);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onFileStart = ({
      fileId,
      name,
      size,
      path,
    }: {
      fileId: string;
      name: string;
      size: number;
      path?: string;
    }) => {
      fileChunks.current[fileId] = {
        name,
        chunks: [],
        size: size || 0,
        startedAt: Date.now(),
        path,
      };
      speedCalculations.current[fileId] = {
        lastTime: Date.now(),
        lastLoaded: 0,
      };
    };

    const onFileChunk = ({
      fileId,
      chunk,
      index,
      totalChunks,
    }: {
      fileId: string;
      chunk: ArrayBuffer;
      index: number;
      totalChunks: number;
    }) => {
      if (!fileChunks.current[fileId]) return;

      fileChunks.current[fileId].chunks[index] = new Uint8Array(chunk);
      const receivedChunks =
        fileChunks.current[fileId].chunks.filter(Boolean).length;

      const now = Date.now();
      const loaded =
        (receivedChunks / totalChunks) * fileChunks.current[fileId].size;
      const speedData = speedCalculations.current[fileId];

      if (speedData && now > speedData.lastTime) {
        const timeDiff = (now - speedData.lastTime) / 1000;
        const loadedDiff = loaded - speedData.lastLoaded;
        const speed = loadedDiff / timeDiff;

        setTransferSpeed((prev) => ({
          ...prev,
          [fileId]: formatSpeed(speed),
        }));

        speedData.lastTime = now;
        speedData.lastLoaded = loaded;
      }

      setProgress((prev) => ({
        ...prev,
        [fileId]: (receivedChunks / totalChunks) * 100,
      }));
    };

    const onFileEnd = ({ fileId }: { fileId: string }) => {
      const {
        name,
        chunks,
        size: originalSize,
        path,
        startedAt,
      } = fileChunks.current[fileId];
      const blob = new Blob(chunks);
      const url = URL.createObjectURL(blob);

      const finalSize =
        originalSize && !isNaN(originalSize) ? originalSize : blob.size;
      const transferTime = (Date.now() - startedAt) / 1000;

      addTransferLog({
        type: "received",
        fileName: name,
        fileSize: formatFileSize(finalSize),
        status: "completed",
        transferTime: `${transferTime.toFixed(2)}s`,
        transferSpeed: formatSpeed(finalSize / transferTime),
        path,
      });

      setReceivedFiles((prev) => [
        ...prev,
        {
          name,
          file: url,
          size: finalSize,
          path,
          receivedAt: new Date(),
        },
      ]);

      setProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });

      setTransferSpeed((prev) => {
        const newSpeeds = { ...prev };
        delete newSpeeds[fileId];
        return newSpeeds;
      });

      delete fileChunks.current[fileId];
      delete speedCalculations.current[fileId];
    };

    const onUsersList = (users: User[]) => {
      setConnectedUsers(users);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("file-start", onFileStart);
    socket.on("file-chunk", onFileChunk);
    socket.on("file-end", onFileEnd);
    socket.on("users-list", onUsersList);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("file-start", onFileStart);
      socket.off("file-chunk", onFileChunk);
      socket.off("file-end", onFileEnd);
      socket.off("users-list", onUsersList);
    };
  }, [userid, isConnected]);

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024)
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatFileSize = (bytes: number) => {
    if (isNaN(bytes)) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleRecipient = (userId: string) => {
    setRecipientIds((prev) =>
      prev.includes(userId) ?
        prev.filter((id) => id !== userId)
      : [...prev, userId],
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        file,
        path: file.name,
        relativePath: file.name,
      }));
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = e.target.files;
      const newFiles: SelectedFile[] = [];

      const basePath = files[0].webkitRelativePath
        .split("/")
        .slice(0, -1)
        .join("/");

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fullPath = file.webkitRelativePath;
        const relativePath =
          basePath ? fullPath.replace(`${basePath}/`, "") : fullPath;

        newFiles.push({
          file,
          path: fullPath,
          relativePath,
        });
      }

      setSelectedFiles((prev) => [...prev, ...newFiles]);
      if (folderInputRef.current) {
        folderInputRef.current.value = "";
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setSelectedFiles([]);
  };

  const sendFiles = async () => {
    if (selectedFiles.length === 0 || recipientIds.length === 0) return;

    setIsUploading(true);
    setProgress({});
    setTransferSpeed({});

    const chunkSize = 256 * 1024;
    const transferId = Date.now().toString();

    selectedFiles.forEach(({ file, relativePath }) => {
      addTransferLog({
        type: "sent",
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        status: "in-progress",
        path:
          relativePath.includes("/") ?
            relativePath.split("/").slice(0, -1).join("/")
          : undefined,
        recipients: recipientIds,
      });
    });

    try {
      for (const recipientId of recipientIds) {
        localStorage.setItem(
          JSON.stringify({
            type: "knownRecipient",
            recipientId,
          }),
          "true",
        );
        for (const { file, relativePath } of selectedFiles) {
          const totalChunks = Math.ceil(file.size / chunkSize);
          const fileId = `${transferId}-${Math.random().toString(36).slice(2, 9)}`;
          const startTime = Date.now();

          socket.emit("file-start", {
            fileId,
            name: file.name,
            size: file.size,
            path:
              relativePath.includes("/") ?
                relativePath.split("/").slice(0, -1).join("/")
              : undefined,
            recipientId,
          });

          for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const chunk = file.slice(start, start + chunkSize);
            const buffer = await chunk.arrayBuffer();

            socket.emit("file-chunk", {
              fileId,
              chunk: buffer,
              index: i,
              totalChunks,
              recipientId,
            });

            const currentTime = Date.now();
            const timeElapsed = (currentTime - startTime) / 1000;
            const bytesSent = (i + 1) * chunkSize;
            const currentSpeed = bytesSent / timeElapsed;

            setTransferSpeed((prev) => ({
              ...prev,
              [fileId]: formatSpeed(currentSpeed),
            }));

            setProgress((prev) => ({
              ...prev,
              [fileId]: ((i + 1) / totalChunks) * 100,
            }));
          }

          socket.emit("file-end", {
            fileId,
            name: file.name,
            path:
              relativePath.includes("/") ?
                relativePath.split("/").slice(0, -1).join("/")
              : undefined,
            recipientId,
          });
        }
      }

      setTransferLogs((prev) =>
        prev.map((log) =>
          log.id.startsWith(transferId) ? { ...log, status: "completed" } : log,
        ),
      );
    } catch (error) {
      setTransferLogs((prev) =>
        prev.map((log) =>
          log.id.startsWith(transferId) ? { ...log, status: "failed" } : log,
        ),
      );
    } finally {
      setIsUploading(false);
      setSelectedFiles([]);
    }
  };

  const downloadAllFiles = async () => {
    if (receivedFiles.length === 0) return;

    const zip = new JSZip();
    const folderStructure: Record<string, JSZip> = {};

    for (const file of receivedFiles) {
      const path = file.path || "";
      let currentFolder = zip;

      if (path) {
        const pathParts = path.split("/");
        let currentPath = "";

        for (const part of pathParts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part;

          if (!folderStructure[currentPath]) {
            folderStructure[currentPath] = currentFolder.folder(part) as JSZip;
          }
          currentFolder = folderStructure[currentPath];
        }
      }

      const response = await fetch(file.file);
      const blob = await response.blob();
      currentFolder.file(file.name, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "received_files.zip");
  };

  const downloadFolder = async (folderPath: string) => {
    const folderFiles = receivedFiles.filter(
      (file) => file.path === folderPath,
    );
    if (folderFiles.length === 0) return;

    const zip = new JSZip();

    for (const file of folderFiles) {
      const response = await fetch(file.file);
      const blob = await response.blob();
      zip.file(file.name, blob);
    }

    const folderName = folderPath.split("/").pop() || "folder";
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${folderName}.zip`);
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-4 md:p-6">
      {/* Connection Status - Responsive layout */}
      <div className="mb-6 rounded-lg border border-zinc-200 p-4 md:mb-8 dark:border-zinc-800">
        <ConnectionStatus
          isConnected={isConnected}
          transferLogs={transferLogs}
          setShowLogs={setShowLogs}
        />

        {isConnected && (
          <DeviceConnection
            showQrCode={showQrCode}
            setShowQrCode={setShowQrCode}
            userid={userid}
            showCopied={showCopied}
            setShowCopied={setShowCopied}
            connectURL={connectURL}
          />
        )}

        {userid && (
          <div className="mt-4 flex items-center justify-between rounded bg-zinc-100 p-3 dark:bg-zinc-800">
            <div className="flex-1 truncate">
              <span className="block text-sm text-zinc-500 dark:text-zinc-400">
                Your ID:
              </span>
              <span className="font-mono text-sm">
                {userid.slice(0, 12)}...
              </span>
            </div>
            <button
              onClick={() => {
                copyToClipboard(userid);
                setShowCopied(true);
                setTimeout(() => setShowCopied(false), 2000);
              }}
              className="ml-2 rounded-full p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              aria-label="Copy ID"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Device Radar - Responsive sizing */}
      <div className="mb-6 rounded-lg border border-zinc-200 p-4 md:mb-8 md:p-6 dark:border-zinc-800">
        <DeviceRadarWrapper
          connectedUsers={connectedUsers}
          userid={userid}
          recipientIds={recipientIds}
          toggleRecipient={toggleRecipient}
        />
      </div>

      {/* Send Files Section - Responsive grid */}
      <div className="mb-6 rounded-lg border border-zinc-200 p-4 md:mb-8 md:p-6 dark:border-zinc-800">
        <h2 className="mb-4 text-lg font-semibold md:text-xl">
          Send Files or Folders
        </h2>

        <div className="space-y-4">
          <FileInputs
            handleFileChange={handleFileChange}
            fileInputRef={fileInputRef}
            handleFolderChange={handleFolderChange}
            folderInputRef={folderInputRef}
          />

          {selectedFiles.length > 0 && (
            <FileList
              selectedFiles={selectedFiles}
              removeFile={removeFile}
              clearFiles={clearFiles}
              formatFileSize={formatFileSize}
            />
          )}

          <RecipientList
            recipientIds={recipientIds}
            toggleRecipient={toggleRecipient}
          />

          <button
            onClick={sendFiles}
            disabled={
              isUploading ||
              selectedFiles.length === 0 ||
              recipientIds.length === 0
            }
            className="flex w-full items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
          >
            {isUploading ?
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            : <>
                <ArrowUpFromLine className="mr-2 h-4 w-4" />
                Send to {recipientIds.length} recipient(s)
              </>
            }
          </button>
        </div>

        <ProgressBars
          isUploading={isUploading}
          progress={progress}
          fileChunks={fileChunks}
          transferSpeed={transferSpeed}
        />
      </div>

      <ReceivedFiles
        receivedFiles={receivedFiles}
        downloadAllFiles={downloadAllFiles}
        downloadFolder={downloadFolder}
        formatFileSize={formatFileSize}
      />

      {showLogs && (
        <TransferLogPanel
          transferLogs={transferLogs}
          clearTransferLogs={clearTransferLogs}
          setShowLogs={setShowLogs}
        />
      )}
    </main>
  );
}
