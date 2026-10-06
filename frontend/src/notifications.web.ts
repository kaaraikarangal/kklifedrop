/**
 * Web implementation of notifications (No-op on web platform)
 * Lock-screen and background push notifications run natively on Android/iOS via notifications.ts
 */

export const PUSH_TOKEN_KEY = "kk_push_token";
export const EMERGENCY_CHANNEL_ID = "emergency-blood-alerts";
export const GENERAL_CHANNEL_ID = "general-blood-alerts";

export async function setupNotificationChannelsAsync(): Promise<void> {}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  return null;
}

export async function syncPushTokenWithBackend(): Promise<void> {}

export async function sendTestLocalNotification(): Promise<boolean> {
  return false;
}

export function setupNotificationListeners(): () => void {
  return () => {};
}
