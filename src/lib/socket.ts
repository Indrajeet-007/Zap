import { signal } from "@preact/signals-react";
import backend from "./api";
import state from "./state";

const RECONNECT_INTERVAL = 1000;

const socket = signal<ReturnType<typeof backend.ws.subscribe>>();

async function connect() {
  if (socket.value?.ws.readyState === WebSocket.OPEN) return;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newSocket.on("message", (message: any) => {
    if (message.data.type === "state-update") {
      state.value = message.data.state;
    }
  });
}

connect();

export default socket;
