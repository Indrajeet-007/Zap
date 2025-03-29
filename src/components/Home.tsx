// Home.tsx
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
import { useEffect, useRef, useState } from "react";
import { socket } from "../lib/socket";
import DeviceRadar from "./DeviceRadar";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { QRCodeSVG } from "qrcode.react";
import { QrCodeIcon } from "@heroicons/react/24/outline";

const connectURL = import.meta.env.VITE_CONNECT_URL
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
  }
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    console.log(urlParams);
    const connectTo = urlParams.get("connect");
  
    if (connectTo && connectTo !== userid) {
      // Add to recipients if not already there 
      if (!recipientIds.includes(connectTo)) {
        setRecipientIds((prev) => [...prev, connectTo]);
      }
  
      // Redirect to /home without parameters
      window.history.replaceState(null, "", "/home");
    }

    const onConnect = () => {
      console.log("✅ Connected:", socket.id);
      setIsConnected(true);
      socket.emit("register", { userId: socket.id });
      if (socket.id) setuserid(socket.id);
    };

    const onDisconnect = () => {
      console.log("❌ Disconnected");
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
      console.log(`📂 Receiving file: ${path ? path + "/" : ""}${name}`);
      fileChunks.current[fileId] = {
        name,
        chunks: [],
        size: size || 0, // Ensure size is always a number
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

      // Calculate transfer speed
      const now = Date.now();
      const loaded =
        (receivedChunks / totalChunks) * fileChunks.current[fileId].size;
      const speedData = speedCalculations.current[fileId];

      if (speedData && now > speedData.lastTime) {
        const timeDiff = (now - speedData.lastTime) / 1000; // in seconds
        const loadedDiff = loaded - speedData.lastLoaded;
        const speed = loadedDiff / timeDiff; // bytes per second

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
      } = fileChunks.current[fileId];
      const blob = new Blob(chunks);
      const url = URL.createObjectURL(blob);

      // Use blob.size as fallback if originalSize is not valid
      const finalSize =
        originalSize && !isNaN(originalSize) ? originalSize : blob.size;

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

      console.log(`✅ File received: ${path ? path + "/" : ""}${name}`);
    };

    const onUsersList = (users: User[]) => {
      console.log("📋 Received users list:", users);
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
  }, [userid]);

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

    const chunkSize = 256 * 1024; // 256KB chunks

    try {
      for (const recipientId of recipientIds) {
        for (const { file, relativePath } of selectedFiles) {
          const totalChunks = Math.ceil(file.size / chunkSize);
          const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

            await new Promise((resolve) => setTimeout(resolve, 5));

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
    } catch (error) {
      console.error("Error during file transfer:", error);
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
          <div className="flex items-center">
            <RefreshCw
              className="mr-2 h-5 w-5 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300"
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
                    value={`${connectURL}/home?connect=${userid}`}
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
                    or share this ID: {userid}
                  </span>
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(userid);
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
        {userid && (
          <div className="mt-4 flex items-center justify-between rounded bg-zinc-100 p-3 dark:bg-zinc-800">
            <div className="flex-1 truncate">
              <span className="block text-sm text-zinc-500 dark:text-zinc-400">
                Your ID:
              </span>
              <span className="font-mono text-sm">{userid}</span>
            </div>
            <button
              onClick={() => copyToClipboard(userid)}
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
            .filter((user) => user.id !== userid)
            .map((user) => ({
              id: user.id,
              name: user.id.slice(0, 8) + "...",
              type: "desktop",
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
    </main>
  );
}
