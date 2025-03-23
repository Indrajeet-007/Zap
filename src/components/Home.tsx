import { useEffect, useState, useRef } from "react";
import { socket } from "../lib/socket";

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

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("file-start");
      socket.off("file-chunk");
      socket.off("file-end");
    };
  }, []);

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
    <div className="flex flex-col items-center justify-center h-screen p-4">
      <h1 className="text-2xl font-bold">Zap - P2P File Sharing</h1>
      <p>Status: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}</p>
      <p>UserID: {userid}</p>
      <input
        type="file"
        onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
        className="border p-2 my-4"
      />
      <input
        type="text"
        placeholder="Enter Recipient ID"
        value={recipientId}
        onChange={(e) => setRecipientId(e.target.value)}
        className="border p-2 my-4"
      />

      <button
        onClick={sendFile}
        disabled={isUploading}
        className={`px-4 py-2 rounded ${
          isUploading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-500 text-white"
        }`}
      >
        {isUploading ? "Uploading..." : "Send File"}
      </button>

      {isUploading && (
        <div className="w-full max-w-md mt-4">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-500 h-4 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-700 text-center mt-1">
            {Math.round(progress)}% Uploaded
          </p>
        </div>
      )}

      {receivedFile && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Received File:</h2>
          <a
            href={receivedFile.file}
            download={receivedFile.name}
            className="text-blue-500 underline"
          >
            {receivedFile.name}
          </a>
        </div>
      )}
    </div>
  );
}

export default Home;
