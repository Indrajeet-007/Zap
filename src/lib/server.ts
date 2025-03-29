import Elysia, { error, t, type Static } from "elysia";
import type { ElysiaWS } from "elysia/ws";
import * as uuid from "uuid";
import * as result from "./result";

export interface User {
  id: string;
  ws: ElysiaWS;
  receivedFiles: Set<string>;
}

const users: Map<string, User> = new Map();
const files: Map<
  string,
  {
    filename: string;
    data: Uint8Array;
  }
> = new Map();

const StateType = t.Object({
  id: t.String(),
  users: t.Array(
    t.Object({
      id: t.String(),
    }),
  ),
  receivedFiles: t.Array(
    t.Object({
      id: t.String(),
    }),
  ),
});

export type State = Static<typeof StateType>;

function pushStateUpdate(ws: ElysiaWS) {
  const user = users.get(ws.id);
  if (!user) {
    throw new Error("pushStateUpdate called after user disconnected.");
  }
  const state: State = {
    id: user.id,
    users: users
      .values()
      .map((user) => ({ id: user.id }))
      .toArray(),
    receivedFiles: user.receivedFiles
      .values()
      .map((fileId) => ({ id: fileId }))
      .toArray(),
  };
  ws.send({ type: "state-update", state });
}

function pushStateUpdatesForEveryone() {
  for (const user of users.values()) {
    pushStateUpdate(user.ws);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const app = new Elysia()
  .get(
    "/download",
    async ({ set, query: { id } }) => {
      const file = files.get(id);
      if (!file) {
        return error(404, "file-not-found");
      }
      set.headers["X-File-Name"] = file.filename;
      return file.data;
    },
    {
      query: t.Object({
        id: t.String(),
      }),
    },
  )
  .post(
    "/upload",
    async ({ body: { file } }) => {
      const id = uuid.v4();
      files.set(id, {
        filename: file.name,
        data: await file.bytes(),
      });
      return id;
    },
    {
      body: t.Object({
        file: t.File(),
      }),
      response: t.String(),
    },
  )
  .post(
    "/sendFile",
    async ({ params: { fileId, recipientId } }) => {
      if (!files.has(fileId)) {
        return result.err({ type: "file-not-found" });
      }
      const recipient = users.get(recipientId);
      if (!recipient) {
        return result.err({ type: "recipient-not-found" });
      }
      pushStateUpdate(recipient.ws);
      return result.ok(true);
    },
    {
      params: t.Object({
        fileId: t.String(),
        recipientId: t.String(),
      }),
      response: result.ResultType(
        t.Literal(true),
        t.Union([
          t.Object({
            type: t.Literal("file-not-found"),
          }),
          t.Object({
            type: t.Literal("recipient-not-found"),
          }),
        ]),
      ),
    },
  )
  .ws("/ws", {
    body: t.Object({
      type: t.Literal("request-state-update"),
    }),
    response: t.Object({
      type: t.Literal("state-update"),
      state: StateType,
    }),
    open(ws) {
      users.set(ws.id, { id: ws.id, ws, receivedFiles: new Set() });
      pushStateUpdatesForEveryone();
    },
    close(ws) {
      users.delete(ws.id);
      pushStateUpdatesForEveryone();
    },
    async message(ws, message) {
      if (message.type !== "request-state-update") {
        throw new Error("unreachable");
      }
      pushStateUpdate(ws);
    },
  })
  .listen({
    hostname: import.meta.env.HOSTNAME,
    port: import.meta.env.PORT,
  });

export type App = typeof app;
