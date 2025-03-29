import { ArrowDown, ArrowUpFromLine, FileIcon, FolderIcon } from "lucide-react";

interface ReceivedFilesProps {
  receivedFiles: any[];
  downloadAllFiles: () => void;
  downloadFolder: (path: string) => void;
  formatFileSize: (bytes: number) => string;
}

export function ReceivedFiles({
  receivedFiles,
  downloadAllFiles,
  downloadFolder,
  formatFileSize,
}: ReceivedFilesProps) {
  if (receivedFiles.length === 0) return null;

  const folders: Record<string, any[]> = {};
  const rootFiles: any[] = [];

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
    <div className="rounded-lg border border-zinc-200 p-4 md:p-6 dark:border-zinc-800">
      <div className="mb-4 flex flex-col items-start justify-between sm:flex-row sm:items-center">
        <h2 className="text-lg font-semibold md:text-xl">Received Files</h2>
        <div className="mt-2 flex items-center space-x-2 sm:mt-0">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {receivedFiles.length} item(s)
          </span>
          <button
            onClick={downloadAllFiles}
            className="inline-flex items-center rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <ArrowDown className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Download All</span>
            <span className="sm:hidden">All</span>
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {Object.entries(folders).map(([path, files]) => (
          <div
            key={path}
            className="rounded-md bg-zinc-100 p-4 dark:bg-zinc-800"
          >
            <div className="mb-2 flex flex-col items-start justify-between sm:flex-row sm:items-center">
              <div className="mb-2 flex items-center sm:mb-0">
                <FolderIcon className="mr-2 h-6 w-6 text-yellow-500" />
                <span className="max-w-[200px] truncate font-medium">
                  {path}
                </span>
              </div>
              <button
                onClick={() => downloadFolder(path)}
                className="inline-flex items-center rounded-md bg-zinc-900 px-2 py-1 text-sm text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <ArrowUpFromLine className="mr-1 h-3 w-3" />
                <span className="hidden sm:inline">Download Folder</span>
                <span className="sm:hidden">Folder</span>
              </button>
            </div>
            <div className="ml-2 space-y-2 sm:ml-8">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b py-2 last:border-b-0"
                >
                  <div className="flex max-w-[70%] items-center">
                    <FileIcon className="mr-2 h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <a
                    href={file.file}
                    download={file.name}
                    className="text-sm whitespace-nowrap text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}

        {rootFiles.map((file, index) => (
          <div
            key={index}
            className="flex flex-col items-start rounded-md bg-zinc-100 p-4 sm:flex-row sm:items-center dark:bg-zinc-800"
          >
            <div className="mb-2 flex items-center sm:mb-0">
              <FileIcon className="mr-3 h-8 w-8 text-zinc-600 dark:text-zinc-300" />
              <div className="min-w-0">
                <p className="max-w-[200px] truncate font-medium sm:max-w-none">
                  {file.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatFileSize(file.size)} •{" "}
                  {file.receivedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <a
              href={file.file}
              download={file.name}
              className="mt-2 ml-auto inline-flex items-center rounded-md bg-zinc-900 px-3 py-1.5 text-white transition-colors hover:bg-zinc-800 sm:mt-0 sm:ml-4 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <ArrowDown className="mr-1 h-4 w-4" />
              Download
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
