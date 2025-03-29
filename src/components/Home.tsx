// Home.tsx
import api from "@/lib/api";
import socket from "@/lib/socket";
import $state from "@/lib/state";
import { copyToClipboard, formatFileSize } from "@/lib/utils";
import { useSignal } from "@preact/signals-react";
import {
  ArrowUpFromLine,
  Copy,
  FileIcon,
  FolderIcon,
  Loader2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import DeviceRadar from "./DeviceRadar";

export default function Home() {
  const isConnected = socket.value?.ws.readyState === WebSocket.OPEN;
  const state = $state.value;
  const recipientIds = useSignal<Set<string>>(new Set());
  const selectedFiles = useSignal<
    {
      relativePath: string;
      file: File;
    }[]
  >([]);

  async function sendFiles() {
    if (selectedFiles.value.length === 0 || recipientIds.value.size === 0)
      return;

    await Promise.all(
      selectedFiles.value.map(async (file) => api.upload.post(file)),
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-4 md:p-6">
      {/* Connection Status */}
      <div className="mb-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isConnected ?
              <Wifi className="h-5 w-5 text-green-600 dark:text-green-500" />
            : <WifiOff className="h-5 w-5 text-red-600 dark:text-red-500" />}
            <span className="font-medium">
              Status: {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        {state && (
          <div className="mt-4 flex items-center justify-between rounded bg-zinc-100 p-3 dark:bg-zinc-800">
            <div className="flex-1 truncate">
              <span className="block text-sm text-zinc-500 dark:text-zinc-400">
                Your ID:
              </span>
              <span className="font-mono text-sm">{state.id}</span>
            </div>
            <button
              onClick={() => copyToClipboard(state.id)}
              className="ml-2 rounded-full p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              aria-label="Copy ID"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mb-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <DeviceRadar
          devices={(state?.users || [])
            .filter((user) => user.id !== state?.id)
            .map((user) => ({
              id: user.id,
              name: user.id.slice(0, 8) + "...",
              type: "desktop",
              avatar: "/placeholder.svg?height=40&width=40",
              online: true,
            }))}
          selectedIds={recipientIds.value}
          onDeviceClick={(device) => {
            if (recipientIds.value.has(device.id)) {
              recipientIds.value.delete(device.id);
              recipientIds.value = new Set(recipientIds.value);
            } else {
              recipientIds.value.add(device.id);
              recipientIds.value = new Set(recipientIds.value);
            }
          }}
        />
      </div>

      {/* Send Files Section */}
      <div className="mb-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="mb-4 text-xl font-semibold">Send Files or Folders</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Select Files
              </label>
              <div className="relative">
                <input
                  type="file"
                  multiple
                  onChange={(ev) => {
                    if (ev.target.files) {
                      selectedFiles.value = Array.from(ev.target.files).map(
                        (file) => ({
                          file,
                          relativePath: file.webkitRelativePath,
                        }),
                      );
                    }
                  }}
                  className="block w-full rounded-md border border-zinc-300 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:border-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Select Folder
              </label>
              <div className="relative">
                <input
                  type="file"
                  // @ts-expect-error - webkitdirectory is not in the type definitions
                  webkitdirectory=""
                  // TODO: implement folder selection
                  // onChange={handleFolderChange}
                  // ref={folderInputRef}
                  className="block w-full rounded-md border border-zinc-300 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:border-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
                />
              </div>
            </div>
          </div>

          {selectedFiles.value.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedFiles.value.length} item
                  {selectedFiles.value.length > 1 ? "s" : ""} selected
                </span>
                <button
                  onClick={() => {
                    selectedFiles.value = [];
                  }}
                  className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto rounded-lg border">
                {selectedFiles.value.map((item) => (
                  <div
                    key={item.relativePath}
                    className="flex items-center justify-between border-b p-2 last:border-b-0 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                      {item.relativePath.includes("/") ?
                        <FolderIcon className="mr-2 h-4 w-4 text-yellow-500" />
                      : <FileIcon className="mr-2 h-4 w-4" />}
                      <div className="min-w-0">
                        <div className="truncate">
                          {item.relativePath.includes("/") ?
                            <>
                              <span className="text-zinc-400 dark:text-zinc-500">
                                {item.relativePath
                                  .split("/")
                                  .slice(0, -1)
                                  .join("/")}
                                /
                              </span>
                              <span>{item.file.name}</span>
                            </>
                          : item.file.name}
                        </div>
                        <div className="text-xs text-zinc-400 dark:text-zinc-500">
                          {formatFileSize(item.file.size)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        selectedFiles.value = selectedFiles.value.filter(
                          (file) => file.relativePath !== item.relativePath,
                        );
                      }}
                      className="rounded-full p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recipientIds.value.size > 0 && (
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium">
                Selected Recipient
                {recipientIds.value.size < 1 ?
                  ""
                : `s (${recipientIds.value.size})`}
              </label>
              <div className="flex flex-wrap gap-2">
                {recipientIds.value.values().map((id) => (
                  <div
                    key={id}
                    className="flex items-center rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800"
                  >
                    <span className="mr-2">{id.slice(0, 8)}...</span>
                    <button
                      onClick={() => {
                        recipientIds.value.delete(id);
                        recipientIds.value = new Set(recipientIds.value);
                      }}
                      className="rounded-full p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                      aria-label="Remove recipient"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={sendFiles}
            disabled={
              isUploading ||
              selectedFiles.length === 0 ||
              recipientIds.length === 0
            }
            className="flex w-full items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
          >
            {isUploading ?
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            : <>
                <ArrowUpFromLine className="mr-2 h-4 w-4" />
                Send to {recipientIds.value.size} recipient
                {recipientIds.value.size > 1 ? "s" : ""}
              </>
            }
          </button>
        </div>

        {/* Progress Bars */}
        {/* isUploading && Object.keys(progress).length > 0 && (
          <div className="mt-4 space-y-4">
            {Object.entries(progress).map(([fileId, fileProgress]) => {
              const fileData = fileChunks.current[fileId];
              const fileName = fileData?.name || "File";
              const filePath = fileData?.path;
              return (
                <div key={fileId}>
                  <div className="mb-1 flex justify-between">
                    <p className="max-w-xs truncate text-sm text-zinc-600 dark:text-zinc-400">
                      {filePath ? `${filePath}/` : ""}
                      {fileName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {transferSpeed[fileId] || "Calculating..."}
                    </p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="h-2 rounded-full bg-zinc-900 transition-all duration-300 dark:bg-white"
                      style={{ width: `${fileProgress}%` }}
                    ></div>
                  </div>
                  <p className="mt-1 text-right text-xs text-zinc-500 dark:text-zinc-400">
                    {Math.round(fileProgress)}% Uploaded
                  </p>
                </div>
              );
            })}
          </div>
        ) */}
      </div>

      {/* Received Files Section */}
      {/* receivedFiles.length > 0 && (
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Received Files</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {receivedFiles.length} item(s)
              </span>
              <button
                onClick={downloadAllFiles}
                className="inline-flex items-center rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Download All
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {// Group files by folder}
            {(() => {
              const folders: Record<string, ReceivedFile[]> = {};
              const rootFiles: ReceivedFile[] = [];

              receivedFiles.forEach((file) => {
                if (file.path) {
                  if (!folders[file.path]) {
                    folders[file.path] = [];
                  }
                  folders[file.path].push(file);
                } else {
                  rootFiles.push(file);
                }
              });

              return (
                <>
                  {// Display folders first}
                  {Object.entries(folders).map(([path, files]) => (
                    <div
                      key={path}
                      className="rounded-md bg-zinc-100 p-4 dark:bg-zinc-800"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center">
                          <FolderIcon className="mr-2 h-6 w-6 text-yellow-500" />
                          <span className="font-medium">{path}</span>
                        </div>
                        <button
                          onClick={() => downloadFolder(path)}
                          className="inline-flex items-center rounded-md bg-zinc-900 px-2 py-1 text-sm text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                          <ArrowUpFromLine className="mr-1 h-3 w-3" />
                          Download Folder
                        </button>
                      </div>
                      <div className="ml-8 space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between border-b py-2 last:border-b-0"
                          >
                            <div className="flex items-center">
                              <FileIcon className="mr-2 h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                              <span>{file.name}</span>
                            </div>
                            <a
                              href={file.file}
                              download={file.name}
                              className="text-sm text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                            >
                              Download
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {// Display root files }
                  {rootFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center rounded-md bg-zinc-100 p-4 dark:bg-zinc-800"
                    >
                      <FileIcon className="mr-3 h-8 w-8 text-zinc-600 dark:text-zinc-300" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{file.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatFileSize(file.size)} •{" "}
                          {file.receivedAt.toLocaleTimeString()}
                        </p>
                      </div>
                      <a
                        href={file.file}
                        download={file.name}
                        className="ml-4 inline-flex items-center rounded-md bg-zinc-900 px-3 py-1.5 text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Download
                      </a>
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </div>
      ) */}
    </main>
  );
}
