import backend from "@/lib/backend";
import { useEffect, useState } from "react";

export default function useSessionId() {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  async function initiatePreConnect() {
    const response = await backend.preConnect.get();
    setSessionId(
      response.headers.get("set-cookie").split(";")[0].split("=")[1],
    );
  }
  useEffect(() => {
    initiatePreConnect();
  }, []);
  return sessionId;
}
