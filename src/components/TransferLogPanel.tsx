import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowDown,
  ArrowUpFromLine,
  CheckCircle,
  Clock,
  X,
} from "lucide-react";
import type { TransferLog } from "./Home";

export interface TransferLogPanelProps {
  clearTransferLogs: () => void;
  setShowLogs: (value: React.SetStateAction<boolean>) => void;
  transferLogs: TransferLog[];
}

export default function TransferLogPanel({
  clearTransferLogs,
  setShowLogs,
  transferLogs,
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
                <div
                  key={log.id}
                  className={cn(
                    "p-4 text-sm transition-colors",
                    log.status === "failed" && "bg-zinc-50 dark:bg-zinc-900",
                    log.status === "in-progress" &&
                      "bg-zinc-50 dark:bg-zinc-900",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700">
                          {log.type === "sent" ?
                            <ArrowUpFromLine className="h-4 w-4" />
                          : <ArrowDown className="h-4 w-4" />}
                        </div>
                        <div className="flex flex-col items-start">
                          <div className="font-medium">
                            {log.path ? `${log.path}/` : ""}
                            {log.fileName}
                          </div>
                          <div className="mt-0.5 flex text-xs text-zinc-500 dark:text-zinc-400">
                            {log.fileSize} •{" "}
                            {log.type === "sent" ? "Sent to" : "Received from"}
                            {log.recipients ?
                              ` ${log.recipients.length} recipient(s)`
                            : ""}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5">
                        {log.status === "completed" ?
                          <CheckCircle className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                        : log.status === "failed" ?
                          <AlertCircle className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                        : <Clock className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                        }
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {log.status}
                        </span>
                      </div>
                      <span className="mt-2 text-xs text-zinc-400">
                        {log.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>
    </div>
  );
}
