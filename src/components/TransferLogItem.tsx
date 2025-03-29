import {
  AlertCircle,
  ArrowDown,
  ArrowUpFromLine,
  CheckCircle,
  Clock,
} from "lucide-react";
import { cn } from "../lib/utils";

interface TransferLogItemProps {
  log: any;
}

export default function TransferLogItem({ log }: TransferLogItemProps) {
  return (
    <div
      className={cn(
        "p-4 text-sm transition-colors",
        log.status === "failed" && "bg-zinc-50 dark:bg-zinc-900",
        log.status === "in-progress" && "bg-zinc-50 dark:bg-zinc-900",
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
                {log.recipients ? ` ${log.recipients.length} recipient(s)` : ""}
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
  );
}
