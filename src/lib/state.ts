import { signal, useSignalEffect } from "@preact/signals-react";
import type { State } from "./server";
import socket from "./socket";

const state = signal<State>();

export function useStateEvent() {
  useSignalEffect(() => {
    socket.value?.send({ type: "request-state-update" });
  });
}

export default state;
