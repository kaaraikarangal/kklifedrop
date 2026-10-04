import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Modal, StyleSheet, Pressable, Animated } from "react-native";
import { colors, radius, spacing } from "./theme";
import Ionicons from "@react-native-vector-icons/ionicons";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: string; kind: ToastKind; title: string; message?: string };

let push: ((t: Omit<ToastItem, "id">) => void) | null = null;

export function toast(kind: ToastKind, title: string, message?: string) {
  push?.({ kind, title, message });
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    push = (t) => {
      const id = Math.random().toString(36).slice(2);
      setItems((x) => [...x, { ...t, id }]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3200);
    };
    return () => { push = null; };
  }, []);
  if (!items.length) return null;
  return (
    <View pointerEvents="box-none" style={styles.host}>
      {items.map((it) => (
        <View key={it.id} style={[styles.toast, kindStyle(it.kind)]} testID={`toast-${it.kind}`}>
          <Ionicons name={icon(it.kind) as any} size={20} color="#FFFFFF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{it.title}</Text>
            {it.message ? <Text style={styles.msg}>{it.message}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function kindStyle(k: ToastKind) {
  if (k === "success") return { backgroundColor: colors.success };
  if (k === "error") return { backgroundColor: colors.error };
  return { backgroundColor: colors.surfaceInverse };
}
function icon(k: ToastKind) {
  if (k === "success") return "checkmark-circle";
  if (k === "error") return "alert-circle";
  return "information-circle";
}

const styles = StyleSheet.create({
  host: {
    position: "absolute", top: 60, left: 16, right: 16,
    gap: 8, zIndex: 9999,
  },
  toast: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  msg: { color: "#FFFFFFCC", fontSize: 12, marginTop: 2 },
});
