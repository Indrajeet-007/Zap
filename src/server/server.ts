import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { ElysiaWS } from "elysia/ws";

function isMobile(userAgent: string) {
  const regex =
    /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return regex.test(userAgent);
}

export interface Device {
  deviceId: string;
  isMobile: boolean;
  /** If undefined, then the device is offline. */
  ws?: ElysiaWS;
}

export interface Transfer {
  name: string;
  path: string;
  chunksReceived: number;
  startedAt: number;
  size: number;
}

const devices: Map<string, Device> = new Map();
const transfers: Map<string, Transfer> = new Map();

function broadcastUsers() {
  const payload = {
    type: "users-list",
    devices: devices
      .values()
      .filter((device) => device.ws)
      .map((device) => ({
        deviceId: device.deviceId,
        isMobile: device.isMobile,
      }))
      .toArray(),
  };
  console.log(payload);
  for (const device of devices.values()) {
    device.ws?.send(payload);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const app = new Elysia()
  .use(cors())
  .get(
    "/preConnect",
    async ({ cookie, headers }) => {
      if (devices.has(cookie.deviceId.value ?? "")) return;
      const deviceId = crypto.randomUUID();
      cookie.deviceId.set({
        value: deviceId,
        httpOnly: false,
        secure: false,
        sameSite: "lax",
      });
      devices.set(deviceId, {
        deviceId,
        isMobile: isMobile(headers["user-agent"] ?? ""),
      });
      console.log(`👤 Device ${deviceId} registered`);
    },
    {},
  )
  .ws("/ws", {
    open(ws) {
      const device = devices.get(ws.data.cookie.deviceId.value ?? "");
      if (!device) {
        return ws.close(1000, "deviceId not set, GET /preConnect first!");
      }
      device.ws = ws;
      broadcastUsers();
      console.log(`🟢 Client connected: ${device.deviceId}`);
    },
    close(ws) {
      const device = devices.get(ws.data.cookie.deviceId.value ?? "");
      if (!device) {
        return ws.close(1000, "deviceId not set, GET /preConnect first!");
      }
      device.ws = undefined;
      broadcastUsers();
      console.log(`❌ Client disconnected: ${device.deviceId}`);
    },
    message(ws, message) {
      const device = devices.get(ws.data.cookie.deviceId.value ?? "");
      if (!device) {
        return ws.close(1000, "deviceId not set, GET /preConnect first!");
      }
      switch (message.type) {
        case "file-start":
          {
            const { fileId, name, size, path, recipientId } = message;
            const recipient = devices.get(recipientId);
            if (!recipient?.ws) {
              ws.send({
                type: "transfer-error",
                fileId,
                message: "Recipient not available",
              });
              return;
            }
            transfers.set(fileId, {
              name,
              size,
              path,
              startedAt: Date.now(),
              chunksReceived: 0,
            });
            recipient.ws.send({
              type: "file-start",
              fileId,
              name,
              size,
              path,
            });
            console.log(`📂 File transfer started: ${name} -> ${recipientId}`);
          }
          break;
        case "file-chunk":
          {
            const { fileId, chunk, index, totalChunks, recipientId } = message;
            const transfer = transfers.get(fileId);
            if (!transfer) {
              ws.send({
                type: "transfer-error",
                fileId,
                message: "File transfer not started",
              });
              return;
            }
            const recipient = devices.get(recipientId);
            if (!recipient?.ws) {
              ws.send({
                type: "transfer-error",
                fileId,
                message: "Recipient not available",
              });
              return;
            }
            transfer.chunksReceived++;
            recipient.ws.send({
              type: "file-chunk",
              fileId,
              chunk,
              index,
              totalChunks,
            });
            console.log(
              `📦 Chunk ${index + 1}/${totalChunks} -> ${recipientId}`,
            );
          }
          break;
        case "file-end":
          {
            const { fileId, name, recipientId } = message;
            const transfer = transfers.get(fileId);
            if (!transfer) {
              ws.send({
                type: "transfer-error",
                fileId,
                message: "File transfer not started",
              });
              return;
            }
            const recipient = devices.get(recipientId);
            if (!recipient?.ws) {
              ws.send({
                type: "transfer-error",
                fileId,
                message: "Recipient not available",
              });
              return;
            }
            recipient.ws.send({
              type: "file-end",
              fileId,
              name,
            });
            const duration = (Date.now() - transfer.startedAt) / 1000;
            const speed = transfer.size / duration;
            console.log(
              `⏱️ File transfer completed: ${name} -> ${recipientId} (${transfer.size} bytes in ${duration.toFixed(
                2,
              )} seconds, ${speed.toFixed(2)} bytes/s)`,
            );
            transfers.delete(fileId);
            console.log(
              `✅ File transfer completed: ${name} -> ${recipientId}`,
            );
          }
          break;
        default:
          message satisfies never;
      }
    },
    body: t.Union([
      t.Object({
        type: t.Literal("file-start"),
        fileId: t.String(),
        name: t.String(),
        size: t.Number(),
        path: t.String(),
        recipientId: t.String(),
      }),
      t.Object({
        type: t.Literal("file-chunk"),
        fileId: t.String(),
        chunk: t.String(),
        index: t.Number(),
        totalChunks: t.Number(),
        recipientId: t.String(),
      }),
      t.Object({
        type: t.Literal("file-end"),
        fileId: t.String(),
        name: t.String(),
        recipientId: t.String(),
      }),
    ]),
  })
  .listen({
    hostname: import.meta.env.HOSTNAME,
    port: import.meta.env.PORT,
  });

export type App = typeof app;

console.log(`🚀 Server running on port ${import.meta.env.PORT}`);
