# Zap

## Development

```shell
git clone https://github.com/Indrajeet-007/Zap
cd Zap
bun install
```

### Environment

Create a `.env` file with the following variables:

- `VITE_SOCKET_URL`: The URL of the socket server. This is the URL of the server running the `src/lib/server.js` file.


**Running the client**

```shell
bun run dev --host --open
```

**Running the server**

```shell
bun run src/lib/server.js
```
