import express from "express"
import http from "http"
import { Server } from "socket.io"

const app = express()
const server = http.createServer(app)
const users = {}
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket"],
})

// Function to broadcast the current users list to all clients
const broadcastUsers = () => {
  const usersList = Object.keys(users).map((userId) => ({
    id: userId,
    socketId: users[userId],
  }))

  io.emit("users-list", usersList)
  console.log(`📊 Broadcasting users list: ${usersList.length} users`)
}

io.on("connection", (socket) => {
  console.log(`🟢 Client connected: ${socket.id}`)

  // Register user ID
  socket.on("register", ({ userId }) => {
    users[userId] = socket.id // Store mapping
    socket.join(userId) // Join room
    console.log(`👤 User ${userId} registered with socket ${socket.id}`)

    // Broadcast updated users list
    broadcastUsers()
  })

  // Start file transfer
  socket.on("file-start", ({ fileId, name, recipientId }) => {
    console.log(`📂 File transfer started: ${name} -> ${recipientId}`)

    if (users[recipientId]) {
      io.to(users[recipientId]).emit("file-start", { fileId, name })
    } else {
      console.log(`⚠️ Recipient ${recipientId} not found`)
    }
  })

  // Handle chunk transfer
  socket.on("file-chunk", ({ fileId, chunk, index, totalChunks, recipientId }) => {
    console.log(`📦 Chunk ${index + 1}/${totalChunks} -> ${recipientId}`)

    if (users[recipientId]) {
      io.to(users[recipientId]).emit("file-chunk", {
        fileId,
        chunk,
        index,
        totalChunks,
      })
    } else {
      console.log(`⚠️ No recipient found for chunk ${index + 1}`)
    }
  })

  // End file transfer
  socket.on("file-end", ({ fileId, name, recipientId }) => {
    console.log(`✅ File transfer completed: ${name} -> ${recipientId}`)

    if (users[recipientId]) {
      io.to(users[recipientId]).emit("file-end", { fileId, name })
    } else {
      console.log(`⚠️ No recipient found for file ${name}`)
    }
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`)
    // Remove user from tracking
    for (const userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId]
        console.log(`🗑️ Removed ${userId} from tracking`)

        // Broadcast updated users list
        broadcastUsers()
        break
      }
    }
  })

  // Send the current users list to the newly connected client
  socket.emit(
    "users-list",
    Object.keys(users).map((userId) => ({
      id: userId,
      socketId: users[userId],
    })),
  )
})

const PORT = 5000
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})

