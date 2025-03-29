import { treaty } from "@elysiajs/eden";
import type { App } from "./server";

const api = treaty<App>(import.meta.env.VITE_BACKEND);
export default api;
