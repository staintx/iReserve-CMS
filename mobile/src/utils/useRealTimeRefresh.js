import { useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";

/**
 * Hook for components/screens to automatically refetch data whenever
 * the backend broadcasts an operational update (`system:refresh` or new notification).
 *
 * @param {Function} onRefresh - Callback function to invoke when real-time refresh occurs
 */
export default function useRealTimeRefresh(onRefresh) {
  const socketContext = useSocket();
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!socketContext?.subscribeToRefresh) return;

    const unsubscribe = socketContext.subscribeToRefresh((data) => {
      if (typeof onRefreshRef.current === "function") {
        onRefreshRef.current(data);
      }
    });

    return unsubscribe;
  }, [socketContext?.subscribeToRefresh]);
}
