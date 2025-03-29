import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const users = {};

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8,
  transports: ["websocket", "polling"],
  allowEIO3: true,
  perMessageDeflate: {
    threshold: 1024,
    zlibDeflateOptions: {
      chunkSize: 16 * 1024,
    },
  },
});

// Track file transfer progress
const fileTransfers = {};

const broadcastUsers = () => {
  const usersList = Object.keys(users).map((userId) => ({
    id: userId,
    socketId: users[userId],
  }));

  io.emit("users-list", usersList);
  console.log(`📊 Broadcasting users list: ${usersList.length} users`);
};

io.on("connection", (socket) => {
  console.log(`🟢 Client connected: ${socket.id}`);

  // Ping-pong for connection health
  socket.on("ping", (data) => {
    socket.emit("pong", { timestamp: data.timestamp });
  });

  socket.on("register", ({ userId }) => {
    users[userId] = socket.id;
    socket.join(userId);
    console.log(`👤 User ${userId} registered with socket ${socket.id}`);
    broadcastUsers();
  });

  socket.on("file-start", ({ fileId, name, size, recipientId, path }) => {
    console.log(
      `📂 File transfer started: ${path ? path + "/" : ""}${name} -> ${recipientId}`,
    );

    if (users[recipientId]) {
      fileTransfers[fileId] = {
        name,
        size,
        path,
        startedAt: Date.now(),
        chunksReceived: 0,
      };

      io.to(users[recipientId]).emit("file-start", {
        fileId,
        name,
        size,
        path,
      });
    } else {
      console.log(`⚠️ Recipient ${recipientId} not found`);
      socket.emit("transfer-error", {
        fileId,
        message: "Recipient not available",
      });
    }
  });

  socket.on(
    "file-chunk",
    ({ fileId, chunk, index, totalChunks, recipientId }, acknowledgement) => {
      if (fileTransfers[fileId]) {
        fileTransfers[fileId].chunksReceived++;
      }

      if (users[recipientId]) {
        io.to(users[recipientId]).emit(
          "file-chunk",
          {
            fileId,
            chunk,
            index,
            totalChunks,
          },
          () => {
            // Send acknowledgement back to sender
            acknowledgement();
          },
        );
      } else {
        console.log(`⚠️ No recipient found for chunk ${index + 1}`);
        socket.emit("transfer-error", {
          fileId,
          message: "Connection lost during transfer",
        });
      }
    },
  );

  socket.on("file-end", ({ fileId, name, recipientId }) => {
    console.log(`✅ File transfer completed: ${name} -> ${recipientId}`);

    if (users[recipientId]) {
      io.to(users[recipientId]).emit("file-end", { fileId, name });
    } else {
      console.log(`⚠️ No recipient found for file ${name}`);
    }

    // Clean up transfer tracking
    if (fileTransfers[fileId]) {
      const transfer = fileTransfers[fileId];
      const duration = (Date.now() - transfer.startedAt) / 1000;
      const speed = transfer.size / duration;
      console.log(
        `📊 Transfer stats: ${formatBytes(transfer.size)} in ${duration.toFixed(1)}s (${formatBytes(speed)}/s)`,
      );
      delete fileTransfers[fileId];
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} (${reason})`);

    // Clean up any ongoing transfers for this socket
    Object.entries(fileTransfers).forEach(([fileId, transfer]) => {
      if (transfer.socketId === socket.id) {
        delete fileTransfers[fileId];
      }
    });

    // Remove user from tracking
    for (const userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        console.log(`🗑️ Removed ${userId} from tracking`);
        broadcastUsers();
        break;
      }
    }
  });

  socket.on("error", (err) => {
    console.error(`Socket error (${socket.id}):`, err);
  });

  // Send initial users list
  socket.emit(
    "users-list",
    Object.keys(users).map((userId) => ({
      id: userId,
      socketId: users[userId],
    })),
  );
});

// Helper function
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i]);
}

// Handle server errors
server.on("error", (err) => {
  console.error("Server error:", err);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
