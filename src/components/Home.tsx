import { QrCodeIcon } from "@heroicons/react/24/outline";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import {
  ArrowDown,
  ArrowUpFromLine,
  Copy,
  FileIcon,
  FolderIcon,
  Loader2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { socket } from "../lib/socket";
import DeviceRadar from "./DeviceRadar";
import TransferLogPanel from "./TransferLogPanel";
const connectURL = import.meta.env.VITE_CONNECT_URL;

export interface TransferLog {
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

const buttonSecondary =
  "flex w-full items-center justify-center gap-1 rounded-md border border-input bg-background px-3 py-1 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground sm:w-auto";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

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
      <div className="bg-card mb-6 rounded-lg border p-4 shadow-sm md:mb-8">
        <div className="flex flex-col items-start justify-between p-2 sm:flex-row sm:items-center">
          <div className="mb-2 flex items-center space-x-2 sm:mb-0">
            {isConnected ?
              <Wifi className="h-5 w-5 text-green-500" />
            : <WifiOff className="h-5 w-5 text-red-500" />}
            <span className="font-medium">
              Status: {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="flex w-full items-center space-x-2 sm:w-auto">
            <button
              onClick={() => setShowLogs(true)}
              className={buttonSecondary}
            >
              <span>View History</span>
              {transferLogs.length > 0 && (
                <span className="bg-primary text-primary-foreground inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium">
                  {transferLogs.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {isConnected && (
          <div className="bg-card mb-4 rounded-lg border p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h3 className="mb-2 text-sm font-medium sm:mb-0">
                Device Connection
              </h3>
              <button
                onClick={() => setShowQrCode(!showQrCode)}
                className={buttonSecondary}
              >
                <QrCodeIcon className="h-4 w-4" />
                {showQrCode ? "Hide QR Code" : "Show QR Code"}
              </button>
            </div>

            {showQrCode && (
              <div className="mt-4 flex flex-col items-center">
                <div className="mb-4 rounded-lg border-4 border-white bg-white p-2">
                  <QRCodeSVG
                    value={`${connectURL}/home?connect=${userid}`}
                    size={window.innerWidth < 400 ? 150 : 200}
                    level="H"
                    includeMargin={false}
                    fgColor="currentColor"
                    className="text-foreground"
                  />
                </div>
                <p className="text-muted-foreground text-center text-sm">
                  Scan this code to connect to this device
                  <br />
                  <span className="mt-1 inline-block text-xs opacity-75">
                    or share this ID: {userid.slice(0, 12)}...
                  </span>
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(userid);
                    setShowCopied(true);
                    setTimeout(() => setShowCopied(false), 2000);
                  }}
                  className="text-primary hover:text-primary/80 mt-2 flex items-center gap-1 text-sm"
                >
                  <Copy className="h-3 w-3" />
                  {showCopied ? "Copied!" : "Copy ID"}
                </button>
              </div>
            )}
          </div>
        )}

        {userid && (
          <div className="bg-accent mt-4 flex items-center justify-between rounded p-3">
            <div className="flex-1 truncate">
              <span className="text-muted-foreground block text-sm">
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
              className="hover:bg-accent/50 ml-2 rounded-full p-2"
              aria-label="Copy ID"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Device Radar - Responsive sizing */}
      <div className="bg-card mb-6 rounded-lg border p-4 shadow-sm md:mb-8 md:p-6">
        <DeviceRadar
          devices={connectedUsers
            .filter((user) => user.id !== userid)
            .map((user) => ({
              id: user.id,
              name: user.id.slice(0, 8) + "...",
              type: user.isMobile ? "phone" : "desktop",
              avatar: "/placeholder.svg?height=40&width=40",
              online: true,
              isSuggested:
                localStorage.getItem(
                  JSON.stringify({
                    type: "knownRecipient",
                    recipientId: user.id,
                  }),
                ) === "true",
            }))}
          selectedIds={recipientIds}
          onDeviceClick={(device) => toggleRecipient(device.id)}
        />
      </div>

      {/* Send Files Section - Responsive grid */}
      <div className="bg-card mb-6 rounded-lg border p-4 shadow-sm md:mb-8 md:p-6">
        <h2 className="mb-4 text-lg font-semibold md:text-xl">
          Send Files or Folders
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Select Files
              </label>
              <div className="relative">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Select Folder
              </label>
              <div className="relative">
                <input
                  type="file"
                  // @ts-expect-error - webkitdirectory is not in the type definitions
                  webkitdirectory=""
                  onChange={handleFolderChange}
                  ref={folderInputRef}
                  className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  {selectedFiles.length} item(s) selected
                </span>
                <button
                  onClick={clearFiles}
                  className="text-destructive hover:text-destructive/80 text-sm"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto rounded-lg border">
                {selectedFiles.map((item, index) => (
                  <div
                    key={index}
                    className="hover:bg-accent/50 flex items-center justify-between border-b p-2 last:border-b-0"
                  >
                    <div className="flex items-center text-sm">
                      {item.relativePath.includes("/") ?
                        <FolderIcon className="mr-2 h-4 w-4 text-yellow-500" />
                      : <FileIcon className="mr-2 h-4 w-4 text-blue-400" />}
                      <div className="min-w-0">
                        <div className="truncate">
                          {item.relativePath.includes("/") ?
                            <>
                              <span className="text-muted-foreground">
                                {item.relativePath
                                  .split("/")
                                  .slice(0, -1)
                                  .join("/")}
                                /
                              </span>
                              <span>{item.file.name}</span>
                            </>
                          : item.file.name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {formatFileSize(item.file.size)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-full p-1"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recipientIds.length > 0 && (
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium">
                Selected Recipients ({recipientIds.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {recipientIds.map((id) => (
                  <div
                    key={id}
                    className="bg-accent flex items-center rounded-full px-3 py-1 text-sm"
                  >
                    <span className="mr-2">{id.slice(0, 8)}...</span>
                    <button
                      onClick={() => toggleRecipient(id)}
                      className="text-muted-foreground hover:bg-accent/50 hover:text-foreground rounded-full p-1"
                      aria-label="Remove recipient"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={sendFiles}
            disabled={
              isUploading ||
              selectedFiles.length === 0 ||
              recipientIds.length === 0
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
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

        {/* Progress Bars */}
        {isUploading && Object.keys(progress).length > 0 && (
          <div className="mt-4 space-y-4">
            {Object.entries(progress).map(([fileId, fileProgress]) => {
              const fileData = fileChunks.current[fileId];
              const fileName = fileData?.name || "File";
              const filePath = fileData?.path;
              return (
                <div key={fileId}>
                  <div className="mb-1 flex justify-between">
                    <p className="max-w-[70%] truncate text-sm">
                      {filePath ? `${filePath}/` : ""}
                      {fileName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {transferSpeed[fileId] || "Calculating..."}
                    </p>
                  </div>
                  <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round(fileProgress)}%` }}
                    ></div>
                  </div>
                  <p className="text-muted-foreground mt-1 text-right text-xs">
                    {Math.round(fileProgress)}% Uploaded
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Received Files Section - Responsive layout */}
      {receivedFiles.length > 0 && (
        <div className="bg-card rounded-lg border p-4 shadow-sm md:p-6">
          <div className="mb-4 flex flex-col items-start justify-between sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold md:text-xl">Received Files</h2>
            <div className="mt-2 flex items-center space-x-2 sm:mt-0">
              <span className="text-muted-foreground text-sm">
                {receivedFiles.length} item(s)
              </span>
              <button
                onClick={downloadAllFiles}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium shadow transition-colors"
              >
                <ArrowDown className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Download All</span>
                <span className="sm:hidden">All</span>
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {/* Group files by folder */}
            {(() => {
              const folders: Record<string, ReceivedFile[]> = {};
              const rootFiles: ReceivedFile[] = [];

              receivedFiles.forEach((file) => {
                if (file.path) {
                  if (!folders[file.path]) {
                    folders[file.path] = [];
                  }
                  folders[file.path].push(file);
                } else {
                  rootFiles.push(file);
                }
              });

              return (
                <>
                  {/* Display folders first */}
                  {Object.entries(folders).map(([path, files]) => (
                    <div key={path} className="bg-accent rounded-md p-4">
                      <div className="mb-2 flex flex-col items-start justify-between sm:flex-row sm:items-center">
                        <div className="mb-2 flex items-center sm:mb-0">
                          <FolderIcon className="mr-2 h-6 w-6 text-yellow-500" />
                          <span className="max-w-[200px] truncate font-medium">
                            {path}
                          </span>
                        </div>
                        <button
                          onClick={() => downloadFolder(path)}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-md px-2 py-1 text-sm font-medium shadow transition-colors"
                        >
                          <ArrowUpFromLine className="mr-1 h-3 w-3" />
                          <span className="hidden sm:inline">
                            Download Folder
                          </span>
                          <span className="sm:hidden">Folder</span>
                        </button>
                      </div>
                      <div className="ml-2 space-y-2 sm:ml-8">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between border-b py-2 last:border-b-0"
                          >
                            <div className="flex max-w-[70%] items-center">
                              <FileIcon className="text-muted-foreground mr-2 h-4 w-4" />
                              <span className="truncate">{file.name}</span>
                            </div>
                            <a
                              href={file.file}
                              download={file.name}
                              className="text-primary hover:text-primary/80 text-sm whitespace-nowrap"
                            >
                              Download
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Display root files */}
                  {rootFiles.map((file, index) => (
                    <div
                      key={index}
                      className="bg-accent flex flex-col items-start rounded-md p-4 sm:flex-row sm:items-center"
                    >
                      <div className="mb-2 flex items-center sm:mb-0">
                        <FileIcon className="text-muted-foreground mr-3 h-8 w-8" />
                        <div className="min-w-0">
                          <p className="max-w-[200px] truncate font-medium sm:max-w-none">
                            {file.name}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatFileSize(file.size)} •{" "}
                            {file.receivedAt.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <a
                        href={file.file}
                        download={file.name}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 ml-auto inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium shadow transition-colors sm:mt-0 sm:ml-4"
                      >
                        <ArrowDown className="mr-1 h-4 w-4" />
                        Download
                      </a>
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Transfer Log Panel */}
      {showLogs && (
        <TransferLogPanel
          clearTransferLogs={clearTransferLogs}
          setShowLogs={setShowLogs}
          transferLogs={transferLogs}
        />
      )}
    </main>
  );
}
