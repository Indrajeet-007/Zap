import DeviceRadar from "./DeviceRadar";

interface DeviceRadarWrapperProps {
  connectedUsers: any[];
  userid: string;
  recipientIds: string[];
  toggleRecipient: (id: string) => void;
}

export function DeviceRadarWrapper({
  connectedUsers,
  userid,
  recipientIds,
  toggleRecipient,
}: DeviceRadarWrapperProps) {
  return (
    <DeviceRadar
      devices={connectedUsers
        .filter((user) => user.id !== userid)
        .map((user) => ({
          id: user.id,
          name: user.id.slice(0, 8) + "...",
          type: user.isMobile ? "phone" : "desktop",
          avatar: "/placeholder.svg?height=40&width=40",
          online: true,
          isSuggested:
            localStorage.getItem(
              JSON.stringify({
                type: "knownRecipient",
                recipientId: user.id,
              }),
            ) === "true",
        }))}
      selectedIds={recipientIds}
      onDeviceClick={(device) => toggleRecipient(device.id)}
    />
  );
}
