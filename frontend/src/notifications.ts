import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { api, getToken, MOBILE_KEY } from "./api";
import { refreshPendingNotifications } from "./pending-notifications";

export const PUSH_TOKEN_KEY = "kk_push_token";
export const LEGACY_PUSH_TOKEN_KEY = "k2_push_token";
export const EMERGENCY_CHANNEL_ID = "emergency-blood-alerts";
export const GENERAL_CHANNEL_ID = "general-blood-alerts";

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
 * Configure high-priority Android notification channels for lock-screen pop-up and sound
 */
export async function setupNotificationChannelsAsync() {
  if (Platform.OS === "android") {
    // 1. MAX Importance channel for critical Emergency alerts (lock-screen banner + sound + vibration)
    await Notifications.setNotificationChannelAsync(EMERGENCY_CHANNEL_ID, {
      name: "Emergency Blood Alerts",
      description: "Immediate critical alerts for matching urgent blood requirements in Karaikal",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250, 250, 250],
      lightColor: "#D31027",
      sound: "default",
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      showBadge: true,
    });

    // 2. High Importance channel for regular notifications and updates
    await Notifications.setNotificationChannelAsync(GENERAL_CHANNEL_ID, {
      name: "General Blood Updates",
      description: "General reminders and donation availability updates",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      enableVibrate: true,
      lightColor: "#D31027",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
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
      console.log("[Push] Notification permission not granted (status:", finalStatus, ")");
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId ||
      (Constants as any).manifest?.extra?.eas?.projectId ||
      "38b63997-abf7-4f63-b138-3cd11d911b46";

    let tokenData;
    try {
      tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    } catch (e: any) {
      console.warn("[Push] Error fetching token with projectId, attempting fallback:", e?.message);
      tokenData = await Notifications.getExpoPushTokenAsync();
    }

    const pushToken = tokenData?.data;
    if (pushToken) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken);

      // Attempt immediate sync with backend if user has an active session or mobile
      const userToken = await getToken();
      const mobile = (await AsyncStorage.getItem(MOBILE_KEY)) || (await AsyncStorage.getItem("k2_mobile"));
      if (userToken || mobile) {
        try {
          await api("/donors/push-token", {
            auth: true,
            body: { push_token: pushToken },
          });
        } catch (err) {
          console.log("[Push] Token sync deferred until next login:", err);
        }
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
    let token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) {
      token = await registerForPushNotificationsAsync();
    }
    if (token) {
      await api("/donors/push-token", {
        auth: true,
        body: { push_token: token },
      });
      console.log("[Push] Push token synced successfully with server");
    }
  } catch (err) {
    console.log("[Push] Failed to sync push token:", err);
  }
}

/**
 * Trigger a diagnostic local notification immediately on this device to verify sound, banner, and channel
 */
export async function sendTestLocalNotification(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    await setupNotificationChannelsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🩸 KK Life Drop: Test Alert",
        body: "Emergency push notification system is active and ready on your device!",
        sound: "default",
        data: { channelId: EMERGENCY_CHANNEL_ID },
      } as any,
      trigger: null, // triggers immediately
    });
    return true;
  } catch (e) {
    console.warn("[Push] Error sending test local notification:", e);
    return false;
  }
}

/**
 * Attach listeners to handle foreground alerts and lock-screen notification taps
 */
export function setupNotificationListeners() {
  if (Platform.OS === "web") return () => {};

  // 1. Check if app was opened by tapping a notification while closed/killed (Cold start)
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) {
      try {
        const data = response.notification.request.content.data;
        const reqId = data?.request_id || data?.id;
        if (reqId) {
          setTimeout(() => {
            router.push({
              pathname: "/request-details",
              params: { id: String(reqId) },
            });
          }, 600);
        }
      } catch (e) {
        console.log("[Push] Cold start navigation error:", e);
      }
    }
  }).catch(() => {});

  // 2. Foreground notification listener (app open)
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log("[Push] Foreground notification received:", notification.request.content.title);
    refreshPendingNotifications().catch(() => {});
  });

  // 3. Listener for when a notification is tapped by the user on the lock screen / notification shade
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    refreshPendingNotifications().catch(() => {});
    try {
      const data = response.notification.request.content.data;
      const reqId = data?.request_id || data?.id;
      if (reqId) {
        router.push({
          pathname: "/request-details",
          params: { id: String(reqId) },
        });
      } else {
        router.push("/(tabs)/notifications");
      }
    } catch (e) {
      console.log("[Push] Navigation error from notification tap:", e);
    }
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}
