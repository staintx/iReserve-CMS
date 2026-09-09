import React from "react";
import { View, ActivityIndicator, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts as usePlusJakarta,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  useFonts as useWorkSans,
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
} from "@expo-google-fonts/work-sans";
import {
  useFonts as usePlayfair,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import { AuthProvider } from "./src/context/AuthContext";
import { SocketProvider } from "./src/context/SocketContext";
import { NetworkProvider } from "./src/context/NetworkContext";
import OfflineBanner from "./src/components/common/OfflineBanner";
import InAppNotificationBanner from "./src/components/common/InAppNotificationBanner";
import RootNavigator from "./src/navigation/RootNavigator";
import { colors } from "./src/constants/theme";

// Remove default browser focus outline on React Native Web
if (Platform.OS === "web" && typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    input, textarea, select, [contenteditable="true"] {
      outline: none !important;
      outline-width: 0 !important;
      box-shadow: none !important;
    }
    input:focus, textarea:focus, select:focus {
      outline: none !important;
      outline-width: 0 !important;
      box-shadow: none !important;
    }
  `;
  document.head.appendChild(style);
}

export default function App() {
  const [plusJakartaLoaded] = usePlusJakarta({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [workSansLoaded] = useWorkSans({
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
  });

  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const fontsLoaded = Boolean(plusJakartaLoaded && workSansLoaded && playfairLoaded);

  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <AuthProvider>
          <SocketProvider>
            <StatusBar style="dark" />
            <OfflineBanner />
            <InAppNotificationBanner />
            <RootNavigator fontsLoaded={fontsLoaded} />
          </SocketProvider>
        </AuthProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}

