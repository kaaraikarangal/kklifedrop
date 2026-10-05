import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "./theme";
import Ionicons from "@react-native-vector-icons/ionicons";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: string; kind: ToastKind; title: string; message?: string; duration?: number };

let push: ((t: Omit<ToastItem, "id">) => void) | null = null;

export function toast(kind: ToastKind, title: string, message?: string, duration: number = 2000) {
  push?.({ kind, title, message, duration });
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    push = (t) => {
      const id = Math.random().toString(36).slice(2);
      const duration = t.duration || 2000;
      setItems((x) => [...x, { ...t, id }]);
      setTimeout(() => {
        setItems((x) => x.filter((i) => i.id !== id));
      }, duration);
    };
    return () => { push = null; };
  }, []);

  if (!items.length) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        { bottom: Math.max(insets.bottom + 65, 75) }
      ]}
    >
      {items.map((it) => (
        <Pressable
          key={it.id}
          onPress={() => setItems((x) => x.filter((i) => i.id !== it.id))}
          style={[styles.toast, kindStyle(it.kind)]}
          testID={`toast-${it.kind}`}
        >
          <Ionicons name={icon(it.kind) as any} size={17} color="#FFFFFF" />
          <View style={styles.contentWrap}>
            <Text style={styles.title} numberOfLines={1}>{it.title}</Text>
            {it.message ? <Text style={styles.msg} numberOfLines={2}>{it.message}</Text> : null}
          </View>
          <Ionicons name="close" size={13} color="rgba(255, 255, 255, 0.6)" style={{ marginLeft: 4 }} />
        </Pressable>
      ))}
    </View>
  );
}

function kindStyle(k: ToastKind) {
  if (k === "success") return { backgroundColor: "#0F766E" }; // modern emerald
  if (k === "error") return { backgroundColor: "#BE123C" };   // modern crimson
  return { backgroundColor: "#1E293B" };                      // slate-800
}

function icon(k: ToastKind) {
  if (k === "success") return "checkmark-circle";
  if (k === "error") return "alert-circle";
  return "information-circle";
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
    gap: 8,
    zIndex: 99999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 22,
    maxWidth: 400,
    minWidth: 160,
    shadowColor: "#0F172A",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  contentWrap: {
    flexShrink: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  msg: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 11,
    marginTop: 1,
  },
});
