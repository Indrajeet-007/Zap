interface FileInputsProps {
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFolderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
}

export function FileInputs({
  handleFileChange,
  fileInputRef,
  handleFolderChange,
  folderInputRef,
}: FileInputsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium">Select Files</label>
        <div className="relative">
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            ref={fileInputRef}
            className="block w-full rounded-md border border-zinc-300 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:border-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Select Folder</label>
        <div className="relative">
          <input
            type="file"
            // @ts-expect-error - webkitdirectory is not in the type definitions
            webkitdirectory=""
            onChange={handleFolderChange}
            ref={folderInputRef}
            className="block w-full rounded-md border border-zinc-300 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:border-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
          />
        </div>
      </div>
    </div>
  );
}
