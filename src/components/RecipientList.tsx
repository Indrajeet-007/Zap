import { X } from "lucide-react";

interface RecipientListProps {
  recipientIds: string[];
  toggleRecipient: (id: string) => void;
}

export function RecipientList({
  recipientIds,
  toggleRecipient,
}: RecipientListProps) {
  if (recipientIds.length === 0) return null;

  return (
    <div className="mt-3">
      <label className="mb-1 block text-sm font-medium">
        Selected Recipients ({recipientIds.length})
      </label>
      <div className="flex flex-wrap gap-2">
        {recipientIds.map((id) => (
          <div
            key={id}
            className="flex items-center rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800"
          >
            <span className="mr-2">{id.slice(0, 8)}...</span>
            <button
              onClick={() => toggleRecipient(id)}
              className="rounded-full p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
              aria-label="Remove recipient"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
