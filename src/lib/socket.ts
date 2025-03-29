import { signal } from "@preact/signals-react";
import backend from "./backend";

const RECONNECT_INTERVAL = 1000;

const socket = signal<ReturnType<typeof backend.ws.subscribe> | undefined>(
  undefined,
);

const response = await backend.preConnect.get();
export const deviceId = (response.headers.get("set-cookie") ?? document.cookie)
  .split(";")[0]
  .split("=")[1];

async function connect() {
  if (socket.value?.ws.readyState === WebSocket.OPEN) return;
  await backend.preConnect.get();
  const newSocket = backend.ws.subscribe();
  newSocket.on("open", () => {
    socket.value = newSocket;
    console.log("🟢 Connected to the WebSocket");
  });
  newSocket.on("close", () => {
    socket.value = undefined;
    console.log("🔴 Disconnected from the WebSocket");
    setTimeout(connect, RECONNECT_INTERVAL);
  });
}

connect();

export default socket;
