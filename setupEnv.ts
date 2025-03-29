import os from "os";
import fs from "fs";

interface NetworkInterfaceInfo {
  address: string;
  family: string;
  internal: boolean;
  // Other properties might exist depending on OS
}

function getPrimaryLocalIP(): string {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (!ifaceList) continue;

    for (const iface of ifaceList) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1"; // fallback to localhost
}

const localIP: string = getPrimaryLocalIP();
console.log("Detected local IP:", localIP);

// Create or update .env file
const envContent: string = `
VITE_SOCKET_URL=http://${localIP}:5000
VITE_CONNECT_URL=http://${localIP}:5173
`.trim();

fs.writeFileSync(".env", envContent);
console.log(".env file updated with local IP");
