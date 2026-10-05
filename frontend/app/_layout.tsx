import React, { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LogBox, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { ToastHost } from "@/src/Toast";
import { registerForPushNotificationsAsync, setupNotificationListeners } from "@/src/notifications";

LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotificationsAsync();
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <KeyboardProvider>
            <View style={{ flex: 1 }}>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
              <ToastHost />
            </View>
          </KeyboardProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
