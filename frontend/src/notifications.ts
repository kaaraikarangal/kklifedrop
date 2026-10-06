import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { api, getActiveSession, ADMIN_USER_KEY } from "./api";
import { supabase } from "./supabase";
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
 * Internal helper to sync a push token and session metadata to the server
 */
async function syncTokenPayload(pushToken: string): Promise<void> {
  if (!pushToken || Platform.OS === "web") return;
  try {
    const session = await getActiveSession().catch(() => null);
    const adminUserStr =
      (await AsyncStorage.getItem(ADMIN_USER_KEY)) ||
      (await AsyncStorage.getItem("k2_admin_user"));
    let adminEmail: string | null = null;
    if (adminUserStr) {
      try {
        adminEmail = JSON.parse(adminUserStr)?.email || null;
      } catch {}
    }

    await api("/donors/push-token", {
      auth: true,
      body: {
        push_token: pushToken,
        mobile: session?.mobile || null,
        donor_id: session?.donorId || null,
        admin_email: adminEmail,
        role: session?.role || (adminEmail ? "admin" : "device"),
        platform: Platform.OS,
      },
    });
    console.log("[Push] Push token synced with server:", pushToken.slice(0, 25) + "...");
  } catch (err) {
    console.warn("[Push] Error syncing push token payload:", err);
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
      // Immediately register with backend so server can target this device
      await syncTokenPayload(pushToken);
    }

    return pushToken;
  } catch (error) {
    console.log("[Push] Error registering for push notifications:", error);
    return null;
  }
}

/**
 * Sync cached push token after successful donor login, registration, or app focus
 */
export async function syncPushTokenWithBackend(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    let token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) {
      token = await registerForPushNotificationsAsync();
    } else {
      await syncTokenPayload(token);
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
 * Attach listeners to handle foreground alerts, live Supabase broadcasts, and lock-screen notification taps
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

  // 4. Live Supabase Realtime broadcast listener (instant audible alert when broadcast or reminder is created)
  let channel: any = null;
  try {
    channel = supabase
      .channel("realtime-emergency-blood-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        async (payload: any) => {
          try {
            const newNotif = payload?.new;
            if (!newNotif) return;

            const session = await getActiveSession().catch(() => null);
            const myDonorId = session?.donorId;
            const myMobile = session?.mobile ? session.mobile.replace(/\D/g, "").slice(-10) : null;
            const notifMobile = newNotif.donor_mobile ? String(newNotif.donor_mobile).replace(/\D/g, "").slice(-10) : null;

            // Show alert if targeted at current user OR if current user is admin testing broadcasts
            const isForMe =
              (myDonorId && newNotif.donor_id === myDonorId) ||
              (myMobile && notifMobile === myMobile) ||
              session?.role === "admin";

            if (isForMe) {
              const isReminder = (newNotif.message || "").includes("REMINDER");
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: isReminder ? "🚨 Blood Alert: REMINDER" : "🚨 EMERGENCY: Blood Required",
                  body: newNotif.message || "Urgent blood requirement in Karaikal. Tap to respond!",
                  sound: "default",
                  data: {
                    request_id: newNotif.request_id,
                    channelId: EMERGENCY_CHANNEL_ID,
                  },
                } as any,
                trigger: null,
              });
              await refreshPendingNotifications().catch(() => {});
            }
          } catch (e) {
            console.log("[Push] Realtime notification handler error:", e);
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.log("[Push] Could not initialize realtime channel:", err);
  }

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
    if (channel) {
      supabase.removeChannel(channel).catch(() => {});
    }
  };
}
