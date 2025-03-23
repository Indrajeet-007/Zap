import {
  ArrowUpFromLine,
  CheckCircle,
  Copy,
  FileIcon,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { socket } from "../lib/socket";
import DeviceRadar from "./DeviceRadar";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  interface ReceivedFile {
    name: string;
    file: string;
  }
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [receivedFile, setReceivedFile] = useState<ReceivedFile | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [recipientId, setRecipientId] = useState(""); // ID of the receiver
  interface FileChunks {
    [key: string]: {
      name: string;
      chunks: Uint8Array[];
    };
  }
  const fileChunks = useRef<FileChunks>({}); // Store incoming file chunks
  const [userid, setuserid] = useState("");
  interface User {
    id: string;
    socketId: string;
  }
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  useEffect(() => {
    socket.on("connect", () => {
      console.log("✅ Connected:", socket.id);
      setIsConnected(true);
      socket.emit("register", { userId: socket.id });
      if (socket.id) setuserid(socket.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected");
      setIsConnected(false);
    });

    socket.on("file-start", ({ fileId, name }) => {
      console.log(`📂 Receiving file: ${name}`);
      fileChunks.current[fileId] = { name, chunks: [] };
    });

    socket.on("file-chunk", ({ fileId, chunk, index, totalChunks }) => {
      console.log(`📦 Received chunk ${index + 1}/${totalChunks}`);
      if (!fileChunks.current[fileId]) return;

      fileChunks.current[fileId].chunks[index] = new Uint8Array(chunk);
      const receivedChunks =
        fileChunks.current[fileId].chunks.filter(Boolean).length;
      setProgress((receivedChunks / totalChunks) * 100);
    });

    socket.on("file-end", ({ fileId }) => {
      const { name, chunks } = fileChunks.current[fileId];
      const blob = new Blob(chunks);
      const url = URL.createObjectURL(blob);

      setReceivedFile({ name, file: url });
      setProgress(0);
      delete fileChunks.current[fileId];

      console.log(`✅ File received: ${name}`);
    });

    // Listen for users list updates
    socket.on("users-list", (users) => {
      console.log("📋 Received users list:", users);
      setConnectedUsers(users);
    });
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("file-start");
      socket.off("file-chunk");
      socket.off("file-end");
      socket.off("users-list");
    };
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const selectRecipient = (userId: string) => {
    setRecipientId(userId);
  };

  const sendFile = async () => {
    if (!selectedFile || !recipientId) return;

    setIsUploading(true);
    setProgress(0);

    const chunkSize = 256 * 1024; // Increased chunk size to 256KB
    const totalChunks = Math.ceil(selectedFile.size / chunkSize);
    const fileId = Date.now();

    socket.emit("file-start", { fileId, name: selectedFile.name, recipientId });

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const chunk = selectedFile.slice(start, start + chunkSize);
      const buffer = await chunk.arrayBuffer();

      socket.emit("file-chunk", {
        fileId,
        chunk: buffer,
        index: i,
        totalChunks,
        recipientId,
      });

      await new Promise((resolve) => setTimeout(resolve, 5)); // Prevent buffer overflow

      setProgress(((i + 1) / totalChunks) * 100);
    }

    socket.emit("file-end", {
      fileId,
      name: selectedFile.name,
      recipientId,
    });

    setIsUploading(false);
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
              onClick={() => socket.connect()}
            />
          </div>
        </div>

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
          selectedId={recipientId}
          onDeviceClick={(device) => selectRecipient(device.id)}
        />
      </div>

      {/* Send File Section */}
      <div className="mb-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="mb-4 text-xl font-semibold">Send a File</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Select File
            </label>
            <div className="relative">
              <input
                type="file"
                onChange={(e) =>
                  e.target.files && setSelectedFile(e.target.files[0])
                }
                className="block w-full rounded-md border border-zinc-300 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:border-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
              />
            </div>
            {selectedFile && (
              <div className="mt-2 flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                <FileIcon className="mr-1 h-4 w-4" />
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="recipient"
              className="mb-1 block text-sm font-medium"
            >
              Recipient ID
            </label>
            <input
              id="recipient"
              type="text"
              placeholder="Enter Recipient ID"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white p-2 focus:ring-2 focus:ring-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:focus:ring-zinc-600"
            />
          </div>

          <button
            onClick={sendFile}
            disabled={isUploading || !selectedFile || !recipientId}
            className="flex w-full items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
          >
            {isUploading ?
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            : <>
                <ArrowUpFromLine className="mr-2 h-4 w-4" />
                Send File
              </>
            }
          </button>
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-2 rounded-full bg-zinc-900 transition-all duration-300 dark:bg-white"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
              {Math.round(progress)}% Uploaded
            </p>
          </div>
        )}
      </div>

      {/* Received File Section */}
      {receivedFile && (
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="mb-4 text-xl font-semibold">Received File</h2>
          <div className="flex items-center rounded-md bg-zinc-100 p-4 dark:bg-zinc-800">
            <FileIcon className="mr-3 h-8 w-8 text-zinc-600 dark:text-zinc-300" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{receivedFile.name}</p>
            </div>
            <a
              href={receivedFile.file}
              download={receivedFile.name}
              className="ml-4 inline-flex items-center rounded-md bg-zinc-900 px-3 py-1.5 text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              Download
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
