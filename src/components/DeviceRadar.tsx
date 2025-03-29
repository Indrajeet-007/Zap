import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Headphones, Laptop, Smartphone, Tv, Watch } from "lucide-react";
import { useEffect, useState } from "react";

export interface Device {
  id: string;
  name: string;
  type: "laptop" | "phone" | "watch" | "tv" | "headphones" | "desktop";
  avatar: string;
  online: boolean;
}

interface DeviceRadarProps {
  devices: Device[];
  selectedIds: Set<string>;
  onDeviceClick?: (device: Device) => void;
}

interface DeviceItemProps {
  device: Device;
  position: { x: number; y: number };
  isSelected: boolean;
  onClick?: (device: Device) => void;
}

function DeviceItem({
  device,
  position,
  isSelected,
  onClick,
}: DeviceItemProps) {
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "laptop":
        return <Laptop className="h-5 w-5" />;
      case "phone":
        return <Smartphone className="h-5 w-5" />;
      case "watch":
        return <Watch className="h-5 w-5" />;
      case "tv":
        return <Tv className="h-5 w-5" />;
      case "headphones":
        return <Headphones className="h-5 w-5" />;
      default:
        return <Laptop className="h-5 w-5" />;
    }
  };

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 cursor-pointer"
      animate={{
        x: position?.x || 0,
        y: position?.y || 0,
      }}
      transition={{
        type: "spring",
        stiffness: 50,
        damping: 20,
      }}
      style={{
        translateX: "-50%",
        translateY: "-50%",
        opacity: device.online ? 1 : 0.5,
      }}
      onClick={() => onClick && onClick(device)}
    >
      <div className="flex flex-col items-center">
        <motion.div whileHover={{ scale: 1.1 }} className="relative">
          <Avatar
            className={`h-12 w-12 border-2 ${
              device.online ? "border-green-500" : "border-gray-300"
            } ${isSelected ? "ring-2 ring-blue-500" : ""}`} // Added ring for selected state
          >
            <AvatarImage src={device.avatar} alt={device.name} />
            <AvatarFallback
              className={`${
                isSelected ? "bg-blue-500 text-white"
                : device.online ? "bg-green-100 text-gray-800"
                : "bg-gray-200 text-gray-800"
              }`}
            >
              {getDeviceIcon(device.type)}
            </AvatarFallback>
          </Avatar>
          {device.online && (
            <motion.div
              className="absolute -inset-1 rounded-full border border-green-500/50"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
              }}
            />
          )}
        </motion.div>
        <span className="mt-2 text-xs font-medium whitespace-nowrap text-gray-800">
          {device.name}
        </span>
        <span className="text-[10px] text-gray-600">
          {device.online ? "Online" : "Offline"}
        </span>
      </div>
    </motion.div>
  );
}

export default function DeviceRadar({
  devices,
  selectedIds,
  onDeviceClick,
}: DeviceRadarProps) {
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  useEffect(() => {
    const updatePositions = () => {
      const newPositions: Record<string, { x: number; y: number }> = {};
      devices.forEach((device, index) => {
        const angle = (index / devices.length) * 2 * Math.PI;
        const radius = 150;
        const baseX = Math.cos(angle) * radius;
        const baseY = Math.sin(angle) * radius;
        newPositions[device.id] = {
          x: baseX + (Math.random() * 10 - 5),
          y: baseY + (Math.random() * 10 - 5),
        };
      });
      setPositions(newPositions);
    };

    updatePositions();
    const interval = setInterval(updatePositions, 1000);

    return () => clearInterval(interval);
  }, [devices]);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-black">Nearby Devices</h1>
        <p className="text-gray-600">
          Displaying {devices.filter((d) => d.online).length} active devices
        </p>
      </div>

      <div className="relative h-[400px] w-[400px]">
        <div className="absolute inset-0 rounded-full border border-gray-300 bg-gray-200/50 backdrop-blur-sm"></div>
        <div className="absolute inset-0 rounded-full border border-gray-300"></div>
        <div className="absolute inset-[25%] rounded-full border border-gray-300"></div>
        <div className="absolute inset-[50%] rounded-full border border-gray-300"></div>

        <div className="absolute inset-0 overflow-hidden rounded-full">
          <motion.div
            className="absolute top-0 left-0 h-full w-full origin-center"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(74, 222, 128, 0.5) 0deg, rgba(74, 222, 128, 0.5) 120deg, transparent 120deg)",
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 4,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        </div>

        <div className="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500"></div>

        {devices.map((device) => (
          <DeviceItem
            key={device.id}
            device={device}
            position={positions[device.id] || { x: 0, y: 0 }}
            isSelected={selectedIds.has(device.id)} // Check if device is in selectedIds
            onClick={onDeviceClick}
          />
        ))}
      </div>
    </div>
  );
}
