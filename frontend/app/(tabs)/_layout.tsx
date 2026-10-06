import React, { useEffect, useState } from "react";
import { AppState } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors } from "@/src/theme";
import {
  subscribePendingCount,
  refreshPendingNotifications,
} from "@/src/pending-notifications";

export default function TabsLayout() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsub = subscribePendingCount((count) => setPendingCount(count));
    refreshPendingNotifications();

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshPendingNotifications();
      }
    });

    return () => {
      unsub();
      appStateSub.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="donors" options={{ title: "Donors", tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }} />
      <Tabs.Screen name="requests" options={{ title: "Requests", tabBarIcon: ({ color, size }) => <Ionicons name="water" size={size} color={color} /> }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />,
          tabBarBadge: pendingCount > 0 ? (pendingCount > 9 ? "9+" : pendingCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#DC2626",
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: "800",
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            lineHeight: 18,
            textAlign: "center",
          },
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
    </Tabs>
  );
}

