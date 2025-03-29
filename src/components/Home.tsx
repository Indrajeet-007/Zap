import { QrCodeIcon } from "@heroicons/react/24/outline";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import {
  ArrowUpFromLine,
  CheckCircle,
  Copy,
  FileIcon,
  FolderIcon,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import $socket, { deviceId } from "../lib/socket";
import DeviceRadar from "./DeviceRadar";

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

function base64ToArrayBuffer(base64: string): Uint8Array {
  var binaryString = atob(base64);
  var bytes = new Uint8Array(binaryString.length);
  for (var i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function Home() {
  const socket = $socket.value;
  const isConnected = !!socket;
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
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
    deviceId: string;
    isMobile: boolean;
  }
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);

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

    if (connectTo && connectTo !== deviceId) {
      if (!recipientIds.includes(connectTo)) {
        setRecipientIds((prev) => [...prev, connectTo]);
      }
      window.history.replaceState(null, "", "/home");
    }

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
      console.log(
        `file-start: ${fileId}, name: ${name}, size: ${size}, path: ${path}`,
      );
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
      chunk: string;
      index: number;
      totalChunks: number;
    }) => {
      console.log(
        `file-chunk: ${fileId}, chunk: ${chunk}, index: ${index}, totalChunks: ${totalChunks}`,
      );
      if (!fileChunks.current[fileId]) return;

      fileChunks.current[fileId].chunks[index] = base64ToArrayBuffer(chunk);
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
      console.log(
        `file-end: ${fileId}, chunks: ${chunks.length}, size: ${originalSize}, path: ${path}, startedAt: ${startedAt}`,
      );
      if (
        chunks.map((c) => c.byteLength).reduce((a, b) => a + b, 0) !==
        originalSize
      ) {
        throw new Error("Chunks size does not match original size");
      }
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

    const onUsersList = ({ devices }: { devices: User[] }) => {
      setConnectedUsers(devices);
    };

    function on(event: string, callback: (data: any) => void) {
      const cb = ({ data: { type, ...data } }: any) => {
        if (type === event) {
          callback(data);
        }
      };
      socket?.on("message", cb);
      return () => {
        socket?.off("message", cb);
      };
    }

    const off1 = on("file-start", onFileStart);
    const off2 = on("file-chunk", onFileChunk);
    const off3 = on("file-end", onFileEnd);
    const off4 = on("users-list", onUsersList);

    return () => {
      off1();
      off2();
      off3();
      off4();
    };
  }, [isConnected]);

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
    if (!socket) return;

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
        for (const { file, relativePath } of selectedFiles) {
          const totalChunks = Math.ceil(file.size / chunkSize);
          const fileId = `${transferId}-${Math.random().toString(36).slice(2, 9)}`;
          const startTime = Date.now();

          socket.send({
            type: "file-start",
            fileId,
            name: file.name,
            size: file.size,
            path:
              relativePath.includes("/") ?
                relativePath.split("/").slice(0, -1).join("/")
              : "",
            recipientId,
          });

          for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const chunk = file.slice(start, start + chunkSize);
            const buffer = await chunk.arrayBuffer();

            socket.send({
              type: "file-chunk",
              fileId,
              chunk: arrayBufferToBase64(buffer),
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

            // await new Promise((resolve) => setTimeout(resolve, 5));

            setProgress((prev) => ({
              ...prev,
              [fileId]: ((i + 1) / totalChunks) * 100,
            }));
          }

          // const transferTime = (Date.now() - startTime) / 1000;
          socket.send({
            type: "file-end",
            fileId,
            name: file.name,
            // path:
            //   relativePath.includes("/") ?
            //     relativePath.split("/").slice(0, -1).join("/")
            //   : undefined,
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

  const TransferLogPanel = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      {" "}
      <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">File Transfer History</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={clearTransferLogs}
              className="rounded-md bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
            >
              Clear History
            </button>
            <button
              onClick={() => setShowLogs(false)}
              className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto rounded-lg border dark:border-zinc-700">
          {transferLogs.length === 0 ?
            <div className="p-4 text-center text-zinc-500">
              No transfer history yet
            </div>
          : <div className="divide-y dark:divide-zinc-700">
              {transferLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 text-sm ${
                    log.status === "failed" ? "bg-red-50 dark:bg-red-900/30"
                    : log.status === "in-progress" ?
                      "bg-blue-50 dark:bg-blue-900/30"
                    : "bg-white dark:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {log.type === "sent" ?
                          <ArrowUpFromLine className="h-4 w-4 text-blue-500" />
                        : <CheckCircle className="h-4 w-4 text-green-500" />}
                        <div>
                          <div className="font-medium">
                            {log.path ? `${log.path}/` : ""}
                            {log.fileName}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {log.fileSize} •{" "}
                            {log.type === "sent" ? "Sent to" : "Received from"}
                            {log.recipients ?
                              ` ${log.recipients.length} recipient(s)`
                            : ""}
                          </div>
                        </div>
                      </div>
                      {log.transferTime && (
                        <div className="mt-1 pl-6 text-xs text-zinc-500 dark:text-zinc-400">
                          {log.transferTime} • {log.transferSpeed}
                        </div>
                      )}
                    </div>
                    <div className="ml-2 flex flex-col items-end">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          log.status === "completed" ?
                            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : log.status === "failed" ?
                            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        }`}
                      >
                        {log.status}
                      </span>
                      <span className="mt-1 text-xs text-zinc-400">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-4 md:p-6">
      {/* Connection Status */}
      <div className="mb-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isConnected ?
              <Wifi className="h-5 w-5 text-green-600 dark:text-green-500" />
            : <WifiOff className="h-5 w-5 text-red-600 dark:text-red-500" />}
            <span className="font-medium">
              Status: {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowLogs(true)}
              className="flex items-center gap-1 rounded-md bg-zinc-100 px-3 py-1 text-sm hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              <span>View History</span>
              {transferLogs.length > 0 && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium dark:bg-zinc-700">
                  {transferLogs.length}
                </span>
              )}
            </button>
            <RefreshCw
              className="h-5 w-5 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300"
              onClick={() => window.location.reload()}
            />
          </div>
        </div>

        {isConnected && (
          <div className="mb-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Device Connection</h3>
              <button
                onClick={() => setShowQrCode(!showQrCode)}
                className="flex items-center gap-1 rounded-md bg-zinc-100 px-3 py-1 text-sm hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                <QrCodeIcon className="h-4 w-4" />
                {showQrCode ? "Hide QR Code" : "Show QR Code"}
              </button>
            </div>

            {showQrCode && (
              <div className="mt-4 flex flex-col items-center">
                <div className="mb-4 rounded-lg border-4 border-white bg-white p-2 dark:border-zinc-900 dark:bg-zinc-900">
                  <QRCodeSVG
                    value={`${connectURL}/home?connect=${deviceId}`}
                    size={200}
                    level="H"
                    includeMargin={false}
                    fgColor="currentColor"
                    className="text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                  Scan this code to connect to this device
                  <br />
                  <span className="mt-1 inline-block text-xs opacity-75">
                    or share this ID: {deviceId}
                  </span>
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(deviceId);
                    setShowCopied(true);
                    setTimeout(() => setShowCopied(false), 2000);
                  }}
                  className="mt-2 flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <Copy className="h-3 w-3" />
                  {showCopied ? "Copied!" : "Copy ID"}
                </button>
              </div>
            )}
          </div>
        )}

        {isConnected && (
          <div className="mt-4 flex items-center justify-between rounded bg-zinc-100 p-3 dark:bg-zinc-800">
            <div className="flex-1 truncate">
              <span className="block text-sm text-zinc-500 dark:text-zinc-400">
                Your ID:
              </span>
              <span className="font-mono text-sm">{deviceId}</span>
            </div>
            <button
              onClick={() => {
                copyToClipboard(deviceId);
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

      <div className="mb-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <DeviceRadar
          devices={connectedUsers
            .filter((user) => user.deviceId !== deviceId)
            .map((user) => ({
              id: user.deviceId,
              name: user.deviceId.slice(0, 8) + "...",
              type: user.isMobile ? "phone" : "desktop",
              avatar: "/placeholder.svg?height=40&width=40",
              online: true,
            }))}
          selectedIds={recipientIds}
          onDeviceClick={(device) => toggleRecipient(device.id)}
        />
      </div>

      {/* Send Files Section */}
      <div className="mb-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="mb-4 text-xl font-semibold">Send Files or Folders</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                  className="block w-full rounded-md border border-zinc-300 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:border-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
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
                  className="block w-full rounded-md border border-zinc-300 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:border-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
                />
              </div>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedFiles.length} item(s) selected
                </span>
                <button
                  onClick={clearFiles}
                  className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto rounded-lg border">
                {selectedFiles.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border-b p-2 last:border-b-0 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                      {item.relativePath.includes("/") ?
                        <FolderIcon className="mr-2 h-4 w-4 text-yellow-500" />
                      : <FileIcon className="mr-2 h-4 w-4" />}
                      <div className="min-w-0">
                        <div className="truncate">
                          {item.relativePath.includes("/") ?
                            <>
                              <span className="text-zinc-400 dark:text-zinc-500">
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
                        <div className="text-xs text-zinc-400 dark:text-zinc-500">
                          {formatFileSize(item.file.size)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="rounded-full p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
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
                    className="flex items-center rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800"
                  >
                    <span className="mr-2">{id.slice(0, 8)}...</span>
                    <button
                      onClick={() => toggleRecipient(id)}
                      className="rounded-full p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
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
                    <p className="max-w-xs truncate text-sm text-zinc-600 dark:text-zinc-400">
                      {filePath ? `${filePath}/` : ""}
                      {fileName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {transferSpeed[fileId] || "Calculating..."}
                    </p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="h-2 rounded-full bg-zinc-900 transition-all duration-300 dark:bg-white"
                      style={{ width: `${fileProgress}%` }}
                    ></div>
                  </div>
                  <p className="mt-1 text-right text-xs text-zinc-500 dark:text-zinc-400">
                    {Math.round(fileProgress)}% Uploaded
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Received Files Section */}
      {receivedFiles.length > 0 && (
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Received Files</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {receivedFiles.length} item(s)
              </span>
              <button
                onClick={downloadAllFiles}
                className="inline-flex items-center rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Download All
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
                    <div
                      key={path}
                      className="rounded-md bg-zinc-100 p-4 dark:bg-zinc-800"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center">
                          <FolderIcon className="mr-2 h-6 w-6 text-yellow-500" />
                          <span className="font-medium">{path}</span>
                        </div>
                        <button
                          onClick={() => downloadFolder(path)}
                          className="inline-flex items-center rounded-md bg-zinc-900 px-2 py-1 text-sm text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                          <ArrowUpFromLine className="mr-1 h-3 w-3" />
                          Download Folder
                        </button>
                      </div>
                      <div className="ml-8 space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between border-b py-2 last:border-b-0"
                          >
                            <div className="flex items-center">
                              <FileIcon className="mr-2 h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                              <span>{file.name}</span>
                            </div>
                            <a
                              href={file.file}
                              download={file.name}
                              className="text-sm text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
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
                      className="flex items-center rounded-md bg-zinc-100 p-4 dark:bg-zinc-800"
                    >
                      <FileIcon className="mr-3 h-8 w-8 text-zinc-600 dark:text-zinc-300" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{file.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatFileSize(file.size)} •{" "}
                          {file.receivedAt.toLocaleTimeString()}
                        </p>
                      </div>
                      <a
                        href={file.file}
                        download={file.name}
                        className="ml-4 inline-flex items-center rounded-md bg-zinc-900 px-3 py-1.5 text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
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
      {showLogs && <TransferLogPanel />}
    </main>
  );
}
