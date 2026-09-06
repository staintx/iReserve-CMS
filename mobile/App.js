import React from "react";
import { View, ActivityIndicator } from "react-native";
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

export default function App() {
  const [fontsLoaded] = usePlusJakarta({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useWorkSans({
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
  });

  usePlayfair({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <AuthProvider>
          <SocketProvider>
            <StatusBar style="dark" />
            <OfflineBanner />
            <InAppNotificationBanner />
            <RootNavigator />
          </SocketProvider>
        </AuthProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}

