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
  isNew: boolean; // Add this field to indicate recently connected devices
}

interface DeviceRadarProps {
  devices: Device[];
  selectedIds?: string[];
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
        return <Laptop className="h-4 w-4 sm:h-5 sm:w-5" />;
      case "phone":
        return <Smartphone className="h-4 w-4 sm:h-5 sm:w-5" />;
      case "watch":
        return <Watch className="h-4 w-4 sm:h-5 sm:w-5" />;
      case "tv":
        return <Tv className="h-4 w-4 sm:h-5 sm:w-5" />;
      case "headphones":
        return <Headphones className="h-4 w-4 sm:h-5 sm:w-5" />;
      default:
        return <Laptop className="h-4 w-4 sm:h-5 sm:w-5" />;
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
          {device.isNew && (
            <div className="absolute -top-2 -right-2 z-10">
              <div className="relative">
                <div className="absolute inset-0 -z-10 animate-ping rounded-full bg-blue-500 opacity-75"></div>
                <div className="relative rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
                  Suggested
                </div>
              </div>
            </div>
          )}
          <Avatar
            className={`h-10 w-10 border-2 sm:h-12 sm:w-12 ${
              device.online ? "border-blue-500" : "border-gray-300"
            } ${isSelected ? "ring-2 ring-blue-500" : ""}`}
          >
            <AvatarImage src={device.avatar} alt={device.name} />
            <AvatarFallback
              className={`${
                isSelected ? "bg-blue-500 text-white"
                : device.online ? "bg-blue-100 text-gray-800"
                : "bg-gray-200 text-gray-800"
              }`}
            >
              {getDeviceIcon(device.type)}
            </AvatarFallback>
          </Avatar>
          {device.online && (
            <motion.div
              className="absolute -inset-1 rounded-full border border-blue-500/50"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
              }}
            />
          )}
        </motion.div>
        <span className="mt-1 text-xs font-medium whitespace-nowrap text-gray-800 sm:mt-2">
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
  selectedIds = [],
  onDeviceClick,
}: DeviceRadarProps) {
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [containerSize, setContainerSize] = useState(300); // Default size for mobile

  useEffect(() => {
    // Update container size based on window width
    const updateSize = () => {
      const width = window.innerWidth;
      setContainerSize(width < 640 ? 250 : 400); // 300px for mobile, 400px for desktop
    };

    updateSize();
    window.addEventListener("resize", updateSize);

    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    const updatePositions = () => {
      const newPositions: Record<string, { x: number; y: number }> = {};
      const radius = containerSize * 0.375; // Adjust radius based on container size

      devices.forEach((device, index) => {
        const angle = (index / devices.length) * 2 * Math.PI;
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
  }, [devices, containerSize]);

  return (
    <div className="flex w-full flex-col items-center justify-center p-4">
      <div className="mb-4 text-center sm:mb-8">
        <h1 className="mb-1 text-xl font-bold text-black sm:mb-2 sm:text-2xl">
          Nearby Devices
        </h1>
        <p className="text-sm text-gray-600 sm:text-base">
          Displaying {devices.filter((d) => d.online).length} active devices
        </p>
      </div>

      <div
        className="relative"
        style={{
          height: `${containerSize}px`,
          width: `${containerSize}px`,
        }}
      >
        <div className="absolute inset-0 rounded-full border border-gray-300 bg-gray-200/50 backdrop-blur-sm"></div>
        <div className="absolute inset-0 rounded-full border border-gray-300"></div>
        <div className="absolute inset-[25%] rounded-full border border-gray-300"></div>
        <div className="absolute inset-[50%] rounded-full border border-gray-300"></div>

        <div className="absolute inset-0 overflow-hidden rounded-full">
          <motion.div
            className="absolute top-0 left-0 h-full w-full origin-center"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(132, 183, 255, 0.35) 0deg, rgba(132, 183, 255, 0.35) 120deg, transparent 120deg)",
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 4,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        </div>

        <div className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 sm:h-2 sm:w-2"></div>

        {devices.map((device) => (
          <DeviceItem
            key={device.id}
            device={device}
            position={positions[device.id] || { x: 0, y: 0 }}
            isSelected={selectedIds.includes(device.id)}
            onClick={onDeviceClick}
          />
        ))}
      </div>
    </div>
  );
}
