interface ProgressBarsProps {
  isUploading: boolean;
  progress: Record<string, number>;
  fileChunks: React.MutableRefObject<any>;
  transferSpeed: Record<string, string>;
}

export function ProgressBars({
  isUploading,
  progress,
  fileChunks,
  transferSpeed,
}: ProgressBarsProps) {
  if (!isUploading || Object.keys(progress).length === 0) return null;

  return (
    <div className="mt-4 space-y-4">
      {Object.entries(progress).map(([fileId, fileProgress]) => {
        const fileData = fileChunks.current[fileId];
        const fileName = fileData?.name || "File";
        const filePath = fileData?.path;
        return (
          <div key={fileId}>
            <div className="mb-1 flex justify-between">
              <p className="max-w-[70%] truncate text-sm text-zinc-600 dark:text-zinc-400">
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
                style={{ width: `${Math.round(fileProgress)}%` }}
              ></div>
            </div>
            <p className="mt-1 text-right text-xs text-zinc-500 dark:text-zinc-400">
              {Math.round(fileProgress)}% Uploaded
            </p>
          </div>
        );
      })}
    </div>
  );
}
