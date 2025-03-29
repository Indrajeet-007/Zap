import { X } from "lucide-react";
import TransferLogItem from "./TransferLogItem";

interface TransferLogPanelProps {
  transferLogs: any[];
  clearTransferLogs: () => void;
  setShowLogs: (show: boolean) => void;
}

export function TransferLogPanel({
  transferLogs,
  clearTransferLogs,
  setShowLogs,
}: TransferLogPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl transition-all dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">
              File Transfer History
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={clearTransferLogs}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                Clear History
              </button>
              <button
                onClick={() => setShowLogs(false)}
                className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {transferLogs.length === 0 ?
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-zinc-500 dark:text-zinc-400">
                No transfer history yet
              </p>
            </div>
          : <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {transferLogs.map((log) => (
                <TransferLogItem key={log.id} log={log} />
              ))}
            </div>
          }
        </div>
      </div>
    </div>
  );
}
