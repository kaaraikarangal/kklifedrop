import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";

interface SearchableSelectModalProps {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
  error?: string;
  testID?: string;
  allowCustom?: boolean;
  emptyNotice?: string;
}

export function SearchableSelectModal({
  label,
  value,
  options,
  placeholder = "Select an option",
  onSelect,
  disabled = false,
  error,
  testID,
  allowCustom = false,
  emptyNotice = "No matching items found",
}: SearchableSelectModalProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [customInput, setCustomInput] = useState("");
  const insets = useSafeAreaInsets();

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const query = search.toLowerCase().trim();
    return options.filter((opt) => opt.toLowerCase().includes(query));
  }, [options, search]);

  const handleOpen = () => {
    if (disabled) return;
    setSearch("");
    setCustomInput("");
    setModalVisible(true);
  };

  const handlePick = (picked: string) => {
    onSelect(picked);
    setModalVisible(false);
  };

  const handleApplyCustom = () => {
    if (customInput.trim()) {
      onSelect(customInput.trim());
      setModalVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        testID={testID}
        disabled={disabled}
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.trigger,
          disabled && styles.triggerDisabled,
          error ? styles.triggerError : null,
          pressed && !disabled ? { opacity: 0.85 } : null,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.valueText,
            !value && styles.placeholderText,
            disabled && styles.disabledText,
          ]}
        >
          {value || placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={disabled ? colors.muted : colors.onSurfaceSecondary}
        />
      </Pressable>

      {error ? <Text style={styles.err}>{error}</Text> : null}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={styles.backdropDismiss}
            onPress={() => setModalVisible(false)}
          />

          <View
            style={[
              styles.modalSheet,
              { paddingBottom: Math.max(insets.bottom, 16) + 12 },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.modalTitle}>{label}</Text>
                <Text style={styles.modalSub}>
                  {options.length} {options.length === 1 ? "option" : "options"} available
                </Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.onSurface} />
              </Pressable>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={`Search ${label.toLowerCase()}...`}
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="words"
                clearButtonMode="while-editing"
              />
              {search ? (
                <Pressable onPress={() => setSearch("")} hitSlop={6}>
                  <Ionicons name="close-circle" size={16} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>

            {/* Custom Input (if allowed) */}
            {allowCustom ? (
              <View style={styles.customBox}>
                <TextInput
                  value={customInput}
                  onChangeText={setCustomInput}
                  placeholder={`Or type other ${label.toLowerCase()}...`}
                  placeholderTextColor={colors.muted}
                  style={styles.customInput}
                />
                <Pressable
                  onPress={handleApplyCustom}
                  disabled={!customInput.trim()}
                  style={[
                    styles.customBtn,
                    !customInput.trim() && styles.customBtnDisabled,
                  ]}
                >
                  <Text style={styles.customBtnText}>Use This</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Options List */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item, index) => `${item}-${index}`}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingVertical: 6 }}
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = item.toLowerCase() === value?.toLowerCase();
                return (
                  <Pressable
                    onPress={() => handlePick(item)}
                    style={({ pressed }) => [
                      styles.itemRow,
                      isSelected && styles.itemRowSelected,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.itemText,
                        isSelected && styles.itemTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.brandPrimary}
                      />
                    ) : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="location-outline" size={32} color={colors.muted} />
                  <Text style={styles.emptyText}>{emptyNotice}</Text>
                  {allowCustom && search.trim() ? (
                    <Pressable
                      style={styles.useSearchBtn}
                      onPress={() => handlePick(search.trim())}
                    >
                      <Text style={styles.useSearchBtnText}>
                        Use &quot;{search.trim()}&quot;
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.onSurfaceSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  trigger: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerDisabled: {
    opacity: 0.6,
    backgroundColor: colors.surfaceSecondary,
  },
  triggerError: {
    borderColor: colors.error,
  },
  valueText: {
    fontSize: 16,
    color: colors.onSurface,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  placeholderText: {
    color: colors.muted,
    fontWeight: "400",
  },
  disabledText: {
    color: colors.muted,
  },
  err: {
    marginTop: 4,
    color: colors.error,
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  backdropDismiss: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: "82%",
    paddingTop: 16,
    paddingHorizontal: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onSurface,
  },
  modalSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.onSurface,
    padding: 0,
  },
  customBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 6,
  },
  customInput: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.onSurface,
  },
  customBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  customBtnDisabled: {
    opacity: 0.4,
  },
  customBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  list: {
    maxHeight: 380,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceTertiary,
  },
  itemRowSelected: {
    backgroundColor: colors.brandPrimaryLight,
  },
  itemText: {
    fontSize: 15,
    color: colors.onSurface,
    fontWeight: "500",
  },
  itemTextSelected: {
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  useSearchBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.pill,
  },
  useSearchBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
});
