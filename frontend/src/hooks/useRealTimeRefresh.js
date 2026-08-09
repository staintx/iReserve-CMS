import { useEffect } from "react";
import { getSocket } from "../api/socket";

export default function useRealTimeRefresh(onRefresh) {
  useEffect(() => {
    const socket = getSocket();
    
    // In case socket is initialized but not connected yet
    if (!socket.connected) {
      socket.connect();
    }

    const handleRefresh = (data) => {
      if (typeof onRefresh === "function") {
        onRefresh(data);
      }
    };

    socket.on("system:refresh", handleRefresh);
    // Also listen to notifications because sometimes they are fired before system:refresh
    // or as a more specific trigger for the customer
    socket.on("notification:new", handleRefresh);

    return () => {
      socket.off("system:refresh", handleRefresh);
      socket.off("notification:new", handleRefresh);
    };
  }, [onRefresh]);
}
