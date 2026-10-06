import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

const READ_NOTIFS_KEY = "kk_read_notification_ids";
const LEGACY_READ_NOTIFS_KEY = "k2_read_notification_ids";

type Listener = (count: number) => void;
const listeners = new Set<Listener>();

let currentPendingCount = 0;
let pendingItemsCache: any[] = [];
let allNotificationsCache: any[] = [];

export function getPendingCount(): number {
  return currentPendingCount;
}

export function getPendingItemsCache(): any[] {
  return pendingItemsCache;
}

export function getAllNotificationsCache(): any[] {
  return allNotificationsCache;
}

export function subscribePendingCount(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentPendingCount);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyPendingCountChanged(count: number) {
  currentPendingCount = count;
  listeners.forEach((fn) => {
    try {
      fn(count);
    } catch {}
  });
}

export async function getReadNotificationIds(): Promise<string[]> {
  try {
    const raw = (await AsyncStorage.getItem(READ_NOTIFS_KEY)) || (await AsyncStorage.getItem(LEGACY_READ_NOTIFS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function markNotificationsAsRead(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  try {
    const existing = await getReadNotificationIds();
    const set = new Set([...existing, ...ids]);
    await AsyncStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Refreshes and calculates pending notifications:
 * A notification is considered "pending" if:
 * 1. The donor has NOT responded to it yet (!item.response), OR
 * 2. The notification has not been viewed/read yet (!readIds.has(item.id))
 */
export async function refreshPendingNotifications(): Promise<{
  pendingCount: number;
  pendingItems: any[];
  allNotifications: any[];
}> {
  try {
    const r: any = await api("/notifications", { auth: true });
    const all = r?.notifications || [];
    const readIdsList = await getReadNotificationIds();
    const readIds = new Set(readIdsList);

    // Pending: requires donor action/response OR is unread
    const pending = all.filter((n: any) => !n.response || !readIds.has(n.id));

    currentPendingCount = pending.length;
    pendingItemsCache = pending;
    allNotificationsCache = all;
    notifyPendingCountChanged(currentPendingCount);

    return {
      pendingCount: currentPendingCount,
      pendingItems: pending,
      allNotifications: all,
    };
  } catch {
    return {
      pendingCount: currentPendingCount,
      pendingItems: pendingItemsCache,
      allNotifications: allNotificationsCache,
    };
  }
}
