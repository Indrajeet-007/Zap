import { treaty } from "@elysiajs/eden";
import type { App } from "../server/server";

const backend = treaty<App>(import.meta.env.VITE_SOCKET_URL, {
  fetch: { credentials: "include", mode: "cors" },
});

export default backend;
