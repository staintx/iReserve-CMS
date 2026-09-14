import { useEffect, useRef } from "react";
import { getSocket } from "../api/socket";

/**
 * Hook to listen for system:refresh and notification:new socket events.
 * Uses a callback ref to avoid unnecessary re-subscriptions on component re-render,
 * and debounces rapid burst emissions to prevent API request storms.
 */
export default function useRealTimeRefresh(onRefresh, debounceMs = 350) {
  const callbackRef = useRef(onRefresh);
  callbackRef.current = onRefresh;
  const timerRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    const handleRefresh = (data) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        if (typeof callbackRef.current === "function") {
          callbackRef.current(data);
        }
      }, debounceMs);
    };

    socket.on("system:refresh", handleRefresh);
    socket.on("notification:new", handleRefresh);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      socket.off("system:refresh", handleRefresh);
      socket.off("notification:new", handleRefresh);
    };
  }, [debounceMs]);
}
