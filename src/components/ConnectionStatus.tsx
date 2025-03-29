import { RefreshCw, Wifi, WifiOff } from "lucide-react";

interface ConnectionStatusProps {
  isConnected: boolean;
  transferLogs: any[];
  setShowLogs: (show: boolean) => void;
}

export function ConnectionStatus({
  isConnected,
  transferLogs,
  setShowLogs,
}: ConnectionStatusProps) {
  return (
    <div className="flex flex-col items-start justify-between p-2 sm:flex-row sm:items-center">
      <div className="mb-2 flex items-center space-x-2 sm:mb-0">
        {isConnected ?
          <Wifi className="h-5 w-5 text-green-600 dark:text-green-500" />
        : <WifiOff className="h-5 w-5 text-red-600 dark:text-red-500" />}
        <span className="font-medium">
          Status: {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <div className="flex w-full items-center space-x-2 sm:w-auto">
        <button
          onClick={() => setShowLogs(true)}
          className="flex w-full items-center justify-center gap-1 rounded-md bg-zinc-100 px-3 py-1 text-sm hover:bg-zinc-200 sm:w-auto dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          <span>View History</span>
          {transferLogs.length > 0 && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium dark:bg-zinc-700">
              {transferLogs.length}
            </span>
          )}
        </button>
        <RefreshCw
          className="h-5 w-5 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300"
          onClick={() => window.location.reload()}
        />
      </div>
    </div>
  );
}
