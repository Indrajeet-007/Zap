import { io } from "socket.io-client";

// Change this to match your server URL if needed
const SOCKET_SERVER_URL = "http://10.12.2.44:5000";

export const socket = io(SOCKET_SERVER_URL, {
  transports: ["websocket"], // Ensures WebSocket is used
});
