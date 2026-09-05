import React, { createContext, useContext, useState, useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";

const NetworkContext = createContext({
  isOnline: true,
  isConnected: true,
  isInternetReachable: true,
  connectionType: "unknown",
});

export const NetworkProvider = ({ children }) => {
  const [networkState, setNetworkState] = useState({
    isOnline: true,
    isConnected: true,
    isInternetReachable: true,
    connectionType: "unknown",
  });

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then((state) => {
      const isOnline = Boolean(
        state.isConnected && state.isInternetReachable !== false
      );
      setNetworkState({
        isOnline,
        isConnected: Boolean(state.isConnected),
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type || "unknown",
      });
    });

    // Event listener subscription
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = Boolean(
        state.isConnected && state.isInternetReachable !== false
      );
      setNetworkState({
        isOnline,
        isConnected: Boolean(state.isConnected),
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type || "unknown",
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <NetworkContext.Provider value={networkState}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  return useContext(NetworkContext);
};

export default NetworkContext;
