import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../constants/config";
import { useAuth } from "./AuthContext";
import notificationsApi from "../api/notifications";
import { showInAppNotification } from "../components/common/InAppNotificationBanner";
import { cacheData, getCachedData, CACHE_KEYS } from "../utils/offlineStorage";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const activeConversationIdRef = useRef(null);

  const setActiveConversationId = useCallback((id) => {
    activeConversationIdRef.current = id;
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!token || !user) return;
    try {
      const res = await notificationsApi.getMine({ limit: 1 });
      if (res && typeof res.unreadCount === "number") {
        setUnreadCount(res.unreadCount);
        cacheData(CACHE_KEYS.NOTIFICATIONS, { unreadCount: res.unreadCount });
      }
    } catch (e) {
      const cached = await getCachedData(CACHE_KEYS.NOTIFICATIONS);
      if (cached && typeof cached.unreadCount === "number") {
        setUnreadCount(cached.unreadCount);
      }
    }
  }, [token, user]);

  const decrementUnreadCount = useCallback((amount = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - amount));
  }, []);

  const clearUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      setUnreadCount(0);
      setUnreadMessagesCount(0);
      return;
    }

    refreshUnreadCount();

    const socketInstance = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token },
      query: { token },
      autoConnect: true,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    // Global operational notification handler
    socketInstance.on("notification:new", (notification) => {
      setUnreadCount((prev) => prev + 1);
      showInAppNotification(notification);
    });

    // Global chat message handler (for alerts when not in active chat thread)
    socketInstance.on("message:new", (message) => {
      const senderId = String(message.sender_id?._id || message.sender_id);
      const myId = String(user._id);

      if (senderId !== myId) {
        setUnreadMessagesCount((prev) => prev + 1);

        // If user is not actively looking at this conversation, show in-app alert
        if (
          String(activeConversationIdRef.current) !==
          String(message.conversation_id)
        ) {
          const senderName =
            message.sender_id?.full_name ||
            message.sender_id?.email ||
            "Catering Team";
          showInAppNotification({
            title: `Message from ${senderName}`,
            body: message.body || "Sent an attachment",
            type: "message",
            meta: { conversation_id: message.conversation_id },
          });
        }
      }
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [token, user?._id, refreshUnreadCount]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        unreadCount,
        unreadMessagesCount,
        refreshUnreadCount,
        decrementUnreadCount,
        clearUnreadCount,
        setActiveConversationId,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};

export default SocketContext;
