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
  isSuggested: boolean;
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

const DeviceIcon = ({ type }: { type: string }) => {
  const iconMap = {
    laptop: <Laptop className="h-4 w-4 sm:h-5 sm:w-5" />,
    phone: <Smartphone className="h-4 w-4 sm:h-5 sm:w-5" />,
    watch: <Watch className="h-4 w-4 sm:h-5 sm:w-5" />,
    tv: <Tv className="h-4 w-4 sm:h-5 sm:w-5" />,
    headphones: <Headphones className="h-4 w-4 sm:h-5 sm:w-5" />,
    desktop: <Laptop className="h-4 w-4 sm:h-5 sm:w-5" />,
  };

  return iconMap[type as keyof typeof iconMap] || iconMap.laptop;
};

const DeviceItem = ({
  device,
  position,
  isSelected,
  onClick,
}: DeviceItemProps) => {
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
      onClick={() => onClick?.(device)}
    >
      <div className="flex flex-col items-center">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative"
        >
          {device.isSuggested && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="absolute -top-2 -right-2 z-10"
            >
              <div className="relative flex-col">
                <motion.div
                  initial={{ scale: 1, opacity: 0 }} // Start from invisible
                  animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut",
                    repeatDelay: 0.5,
                  }}
                  className="absolute inset-0 -z-10 rounded-full bg-blue-500"
                />
                {/* Badge */}
                <div className="relative flex p-1 items-center justify-center rounded-full bg-blue-500 text-[10px] font-medium text-white shadow-md">
                  Suggested
                </div>
              </div>
            </motion.div>
          )}

          <Avatar
            className={`h-10 w-10 border-2 transition-all sm:h-12 sm:w-12 ${
              device.online ?
                "border-blue-500 hover:border-blue-600"
              : "border-gray-300"
            } ${isSelected ? "ring-4 ring-blue-400/30" : ""}`}
          >
            <AvatarImage src={device.avatar} alt={device.name} />
            <AvatarFallback
              className={`transition-colors ${
                isSelected ? "bg-blue-500 text-white"
                : device.online ? "bg-blue-100 text-gray-800"
                : "bg-gray-200 text-gray-800"
              }`}
            >
              <DeviceIcon type={device.type} />
            </AvatarFallback>
          </Avatar>

          {device.online && (
            <motion.div
              className="pointer-events-none absolute -inset-1 rounded-full border border-blue-500/50"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 0.3, 0.7],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
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
};

export default function DeviceRadar({
  devices,
  selectedIds = [],
  onDeviceClick,
}: DeviceRadarProps) {
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [containerSize, setContainerSize] = useState(300);

  useEffect(() => {
    const updateSize = () => {
      setContainerSize(window.innerWidth < 640 ? 250 : 400);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    const updatePositions = () => {
      const newPositions: Record<string, { x: number; y: number }> = {};
      const radius = containerSize * 0.35;
      const centerOffset = containerSize * 0.05;

      devices.forEach((device, index) => {
        const angle = (index / devices.length) * Math.PI * 2;
        const baseX = Math.cos(angle) * radius;
        const baseY = Math.sin(angle) * radius;

        // Add some randomness but keep devices generally in their sector
        newPositions[device.id] = {
          x: baseX + (Math.random() * centerOffset * 2 - centerOffset),
          y: baseY + (Math.random() * centerOffset * 2 - centerOffset),
        };
      });

      setPositions(newPositions);
    };

    updatePositions();
    const interval = setInterval(updatePositions, 1500);
    return () => clearInterval(interval);
  }, [devices, containerSize]);

  const onlineCount = devices.filter((d) => d.online).length;

  return (
    <div className="flex w-full flex-col items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 text-center sm:mb-8"
      >
        <h1 className="mb-1 text-2xl font-bold text-gray-900 sm:text-3xl">
          Nearby Devices
        </h1>
        <p className="text-sm text-gray-600 sm:text-base">
          {onlineCount} {onlineCount === 1 ? "device" : "devices"} active in
          your network
        </p>
      </motion.div>

      <div
        className="relative"
        style={{
          height: `${containerSize}px`,
          width: `${containerSize}px`,
        }}
      >
        {/* Radar background elements */}
        <div className="absolute inset-0 rounded-full border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 backdrop-blur-sm" />

        {/* Radar circles */}
        {[0, 0.25, 0.5, 0.75].map((size) => (
          <div
            key={size}
            className="absolute rounded-full border border-gray-200/80"
            style={{
              inset: `${size * 100}%`,
            }}
          />
        ))}

        {/* Radar sweep animation */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <motion.div
            className="absolute top-0 left-0 h-full w-full origin-center"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(99, 179, 237, 0.25) 0deg, rgba(99, 179, 237, 0.25) 90deg, transparent 90deg)",
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 3.5,
              ease: "linear",
              repeat: Infinity,
            }}
          />
        </div>

        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 shadow-sm" />

        {/* Devices */}
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
