import { FileIcon, FolderIcon, X } from "lucide-react";

interface FileListProps {
  selectedFiles: any[];
  removeFile: (index: number) => void;
  clearFiles: () => void;
  formatFileSize: (bytes: number) => string;
}

export function FileList({
  selectedFiles,
  removeFile,
  clearFiles,
  formatFileSize,
}: FileListProps) {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {selectedFiles.length} item(s) selected
        </span>
        <button
          onClick={clearFiles}
          className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400"
        >
          Clear all
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto rounded-lg border">
        {selectedFiles.map((item, index) => (
          <div
            key={index}
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
                        {item.relativePath.split("/").slice(0, -1).join("/")}/
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
              onClick={() => removeFile(index)}
              className="rounded-full p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
