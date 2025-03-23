import { useEffect, useState, useRef } from "react";
import { socket } from "../lib/socket";
import {
  ArrowUpFromLine,
  CheckCircle,
  Copy,
  FileIcon,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  Users,
} from "lucide-react";
function Home() {
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
    <main className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6">
      {/* Connection Status */}
      <div className="mb-8 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-600 dark:text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600 dark:text-red-500" />
            )}
            <span className="font-medium">
              Status: {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="flex items-center">
            <RefreshCw
              className="h-5 w-5 mr-2 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300"
              onClick={() => socket.connect()}
            />
          </div>
        </div>

        {userid && (
          <div className="mt-4 p-3 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-between">
            <div className="truncate flex-1">
              <span className="text-sm text-zinc-500 dark:text-zinc-400 block">
                Your ID:
              </span>
              <span className="font-mono text-sm">{userid}</span>
            </div>
            <button
              onClick={() => copyToClipboard(userid)}
              className="ml-2 p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
              aria-label="Copy ID"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mb-8 p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Connected Users ({connectedUsers.length})
          </h2>
        </div>

        {connectedUsers.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {connectedUsers.map((user) => (
              <div
                key={user.id}
                className={`p-3 rounded-md flex items-center justify-between cursor-pointer transition-colors
                    ${
                      recipientId === user.id
                        ? "bg-zinc-200 dark:bg-zinc-700"
                        : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }
                    ${
                      user.id === userid
                        ? "border-l-4 border-zinc-400 dark:border-zinc-500"
                        : ""
                    }
                  `}
                onClick={() => user.id !== userid && selectRecipient(user.id)}
              >
                <div className="truncate flex-1">
                  <span className="font-mono text-sm block truncate">
                    {user.id}
                  </span>
                  {user.id === userid && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      You
                    </span>
                  )}
                </div>
                {user.id !== userid && (
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(user.id);
                      }}
                      className="p-1.5 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600"
                      aria-label="Copy ID"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
            No users connected
          </div>
        )}
      </div>

      {/* Send File Section */}
      <div className="mb-8 p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Send a File</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Select File
            </label>
            <div className="relative">
              <input
                type="file"
                onChange={(e) =>
                  e.target.files && setSelectedFile(e.target.files[0])
                }
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0 file:font-medium
                    file:bg-zinc-100 file:text-zinc-700
                    dark:file:bg-zinc-800 dark:file:text-zinc-200
                    hover:file:bg-zinc-200 dark:hover:file:bg-zinc-700
                    border border-zinc-300 dark:border-zinc-700 rounded-md"
              />
            </div>
            {selectedFile && (
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 flex items-center">
                <FileIcon className="h-4 w-4 mr-1" />
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="recipient"
              className="block text-sm font-medium mb-1"
            >
              Recipient ID
            </label>
            <input
              id="recipient"
              type="text"
              placeholder="Enter Recipient ID"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded-md 
                  bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 
                  focus:ring-zinc-400 dark:focus:ring-zinc-600"
            />
          </div>

          <button
            onClick={sendFile}
            disabled={isUploading || !selectedFile || !recipientId}
            className="w-full flex items-center justify-center px-4 py-2 rounded-md
                bg-zinc-900 text-white dark:bg-white dark:text-zinc-900
                hover:bg-zinc-800 dark:hover:bg-zinc-200
                disabled:bg-zinc-300 dark:disabled:bg-zinc-700
                disabled:text-zinc-500 dark:disabled:text-zinc-400
                disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <ArrowUpFromLine className="h-4 w-4 mr-2" />
                Send File
              </>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="mt-4">
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-zinc-900 dark:bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mt-2">
              {Math.round(progress)}% Uploaded
            </p>
          </div>
        )}
      </div>

      {/* Received File Section */}
      {receivedFile && (
        <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Received File</h2>
          <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-md flex items-center">
            <FileIcon className="h-8 w-8 mr-3 text-zinc-600 dark:text-zinc-300" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{receivedFile.name}</p>
            </div>
            <a
              href={receivedFile.file}
              download={receivedFile.name}
              className="ml-4 inline-flex items-center px-3 py-1.5 rounded-md
                  bg-zinc-900 text-white dark:bg-white dark:text-zinc-900
                  hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Download
            </a>
          </div>
        </div>
      )}
    </main>
  );
}

export default Home;
