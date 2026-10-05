import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { api, getToken } from "./api";

export const PUSH_TOKEN_KEY = "k2_push_token";
export const EMERGENCY_CHANNEL_ID = "emergency-blood-alerts";

// Set notification handler for foreground / background display behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

/**
 * Configure high-priority Android notification channel for lock-screen pop-up
 */
export async function setupNotificationChannelsAsync() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(EMERGENCY_CHANNEL_ID, {
      name: "Emergency Blood Alerts",
      description: "Immediate alerts for matching urgent blood requirements",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D31027",
      sound: "default",
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }
}

/**
 * Request permission & register device for Expo Push Notifications
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    await setupNotificationChannelsAsync();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Push] Notification permission not granted");
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      (Constants as any).manifest?.extra?.eas?.projectId ||
      "38b63997-abf7-4f63-b138-3cd11d911b46";

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const pushToken = tokenData.data;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken);

    // Sync token with backend if user has an active session
    const userToken = await getToken();
    if (userToken) {
      try {
        await api("/donors/push-token", {
          auth: true,
          body: { push_token: pushToken },
        });
      } catch (err) {
        console.log("[Push] Token sync deferred until next login:", err);
      }
    }

    return pushToken;
  } catch (error) {
    console.log("[Push] Error registering for push notifications:", error);
    return null;
  }
}

/**
 * Sync cached push token after successful donor login or registration
 */
export async function syncPushTokenWithBackend(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await api("/donors/push-token", {
        auth: true,
        body: { push_token: token },
      });
    } else {
      await registerForPushNotificationsAsync();
    }
  } catch (err) {
    console.log("[Push] Failed to sync push token:", err);
  }
}

/**
 * Attach listeners to handle lock-screen notification taps
 */
export function setupNotificationListeners() {
  if (Platform.OS === "web") return () => {};

  // Listener for when a notification is tapped by the user on the lock screen / notification shade
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    try {
      const data = response.notification.request.content.data;
      if (data?.request_id) {
        router.push({
          pathname: "/request-details",
          params: { id: String(data.request_id) },
        });
      } else {
        router.push("/(tabs)/notifications");
      }
    } catch (e) {
      console.log("[Push] Navigation error from notification tap:", e);
    }
  });

  return () => {
    responseSubscription.remove();
  };
}
