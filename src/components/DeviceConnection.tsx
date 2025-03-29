import { QrCodeIcon } from "@heroicons/react/24/outline";
import { Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface DeviceConnectionProps {
  showQrCode: boolean;
  setShowQrCode: (show: boolean) => void;
  userid: string;
  showCopied: boolean;
  setShowCopied: (show: boolean) => void;
  connectURL: string;
}

export function DeviceConnection({
  showQrCode,
  setShowQrCode,
  userid,
  showCopied,
  setShowCopied,
  connectURL,
}: DeviceConnectionProps) {
  return (
    <div className="mb-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h3 className="mb-2 text-sm font-medium sm:mb-0">Device Connection</h3>
        <button
          onClick={() => setShowQrCode(!showQrCode)}
          className="flex w-full items-center justify-center gap-1 rounded-md bg-zinc-100 px-3 py-1 text-sm hover:bg-zinc-200 sm:w-auto dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          <QrCodeIcon className="h-4 w-4" />
          {showQrCode ? "Hide QR Code" : "Show QR Code"}
        </button>
      </div>

      {showQrCode && (
        <div className="mt-4 flex flex-col items-center">
          <div className="mb-4 rounded-lg border-4 border-white bg-white p-2 dark:border-zinc-900 dark:bg-zinc-900">
            <QRCodeSVG
              value={`${connectURL}/home?connect=${userid}`}
              size={window.innerWidth < 400 ? 150 : 200}
              level="H"
              includeMargin={false}
              fgColor="currentColor"
              className="text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Scan this code to connect to this device
            <br />
            <span className="mt-1 inline-block text-xs opacity-75">
              or share this ID: {userid.slice(0, 12)}...
            </span>
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(userid);
              setShowCopied(true);
              setTimeout(() => setShowCopied(false), 2000);
            }}
            className="mt-2 flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Copy className="h-3 w-3" />
            {showCopied ? "Copied!" : "Copy ID"}
          </button>
        </div>
      )}
    </div>
  );
}
