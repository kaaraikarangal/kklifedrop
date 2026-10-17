import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import {
  formatDateToDDMMYYYY,
  formatDateToYYYYMMDD,
  autoFormatDDMMYYYY,
  isValidDDMMYYYY,
} from "@/src/utils/dateUtils";

interface DatePickerFieldProps {
  label: string;
  value: string; // Accepts DD-MM-YYYY or YYYY-MM-DD
  onChange: (ddmmyyyy: string, yyyymmdd: string) => void;
  placeholder?: string;
  testID?: string;
  minDate?: Date;
  maxDate?: Date;
  allowClear?: boolean;
  onClear?: () => void;
  helperText?: string;
  error?: string;
  disabled?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "DD-MM-YYYY",
  testID,
  minDate,
  maxDate,
  allowClear = false,
  onClear,
  helperText,
  error,
  disabled = false,
}: DatePickerFieldProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"days" | "years" | "months">("days");

  // Parse current value to initialize calendar focus
  const currentFormatted = useMemo(() => formatDateToDDMMYYYY(value), [value]);

  const initialCalendarDate = useMemo(() => {
    const iso = formatDateToYYYYMMDD(value);
    if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(initialCalendarDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialCalendarDate.getMonth()); // 0-indexed

  // Available year range for picker: 1940 to currentYear + 10
  const yearRange = useMemo(() => {
    const currentYr = new Date().getFullYear();
    const startYr = minDate ? minDate.getFullYear() : 1940;
    const endYr = maxDate ? maxDate.getFullYear() : currentYr + 5;
    const list: number[] = [];
    for (let y = endYr; y >= startYr; y--) {
      list.push(y);
    }
    return list;
  }, [minDate, maxDate]);

  const openCalendar = () => {
    if (disabled) return;
    const d = initialCalendarDate;
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setViewMode("days");
    setModalOpen(true);
  };

  const handleManualTextChange = (text: string) => {
    const formatted = autoFormatDDMMYYYY(text);
    const iso = formatDateToYYYYMMDD(formatted);
    onChange(formatted, iso);
  };

  // Calendar Day Calculation
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      dateObj: Date;
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({
        day,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateObj: new Date(y, m, day),
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        day: i,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        dateObj: new Date(viewYear, viewMonth, i),
      });
    }

    // Next month padding to fill out 35 or 42 cells (multiple of 7)
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const m = viewMonth === 11 ? 0 : viewMonth + 1;
        const y = viewMonth === 11 ? viewYear + 1 : viewYear;
        cells.push({
          day: i,
          month: m,
          year: y,
          isCurrentMonth: false,
          dateObj: new Date(y, m, i),
        });
      }
    }

    return cells;
  }, [viewYear, viewMonth]);

  const selectDay = (dateObj: Date) => {
    const ddmmyyyy = formatDateToDDMMYYYY(dateObj);
    const yyyymmdd = formatDateToYYYYMMDD(dateObj);
    onChange(ddmmyyyy, yyyymmdd);
    setModalOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const isDateSelected = (dateObj: Date) => {
    if (!currentFormatted) return false;
    return formatDateToDDMMYYYY(dateObj) === currentFormatted;
  };

  const isToday = (dateObj: Date) => {
    const today = new Date();
    return (
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    );
  };

  const isDateDisabled = (dateObj: Date) => {
    if (minDate && dateObj < new Date(minDate.setHours(0, 0, 0, 0))) return true;
    if (maxDate && dateObj > new Date(maxDate.setHours(23, 59, 59, 999))) return true;
    return false;
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.fieldWrap, !!error && styles.fieldWrapError]}>
        {/* Editable input in DD-MM-YYYY format */}
        <TextInput
          style={styles.input}
          value={currentFormatted}
          onChangeText={handleManualTextChange}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType="number-pad"
          maxLength={10}
          editable={!disabled}
          testID={testID}
        />

        {/* Clear Button */}
        {allowClear && !!currentFormatted ? (
          <Pressable
            onPress={() => {
              if (onClear) onClear();
              onChange("", "");
            }}
            style={styles.clearBtn}
            testID={testID ? `${testID}-clear` : undefined}
          >
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </Pressable>
        ) : null}

        {/* Dedicated "Choose in Calendar" button */}
        <Pressable
          style={styles.calendarTriggerBtn}
          onPress={openCalendar}
          testID={testID ? `${testID}-calendar-btn` : undefined}
          accessibilityLabel="Choose in Calendar"
        >
          <Ionicons name="calendar" size={15} color={colors.brandPrimary} />
          <Text style={styles.calendarTriggerText}>Choose in Calendar</Text>
        </Pressable>
      </View>

      {helperText && !error ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* CALENDAR MODAL */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.calendarModal}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <Ionicons name="calendar-outline" size={20} color={colors.brandPrimary} />
                <Text style={styles.modalHeaderTitle}>Select Date (DD-MM-YYYY)</Text>
              </View>
              <Pressable
                onPress={() => setModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* Month & Year Navigation Bar */}
            <View style={styles.navBar}>
              <Pressable onPress={prevMonth} style={styles.navArrowBtn}>
                <Ionicons name="chevron-back" size={20} color="#0F172A" />
              </Pressable>

              <View style={styles.navSelectorsRow}>
                <Pressable
                  style={styles.navMonthYearBtn}
                  onPress={() => setViewMode(viewMode === "months" ? "days" : "months")}
                >
                  <Text style={styles.navMonthYearText}>{MONTH_NAMES[viewMonth]}</Text>
                  <Ionicons name="caret-down" size={12} color="#64748B" />
                </Pressable>

                <Pressable
                  style={styles.navMonthYearBtn}
                  onPress={() => setViewMode(viewMode === "years" ? "days" : "years")}
                >
                  <Text style={styles.navMonthYearText}>{viewYear}</Text>
                  <Ionicons name="caret-down" size={12} color="#64748B" />
                </Pressable>
              </View>

              <Pressable onPress={nextMonth} style={styles.navArrowBtn}>
                <Ionicons name="chevron-forward" size={20} color="#0F172A" />
              </Pressable>
            </View>

            {/* BODY: DAYS GRID OR YEAR/MONTH PICKER */}
            {viewMode === "days" ? (
              <View style={styles.daysView}>
                {/* Day of Week Labels */}
                <View style={styles.dayLabelsRow}>
                  {DAY_LABELS.map((d, i) => (
                    <Text
                      key={d}
                      style={[
                        styles.dayLabelText,
                        (i === 0 || i === 6) && styles.weekendLabel,
                      ]}
                    >
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.gridContainer}>
                  {calendarGrid.map((item, index) => {
                    const selected = isDateSelected(item.dateObj);
                    const today = isToday(item.dateObj);
                    const disabledDay = isDateDisabled(item.dateObj);

                    return (
                      <Pressable
                        key={index}
                        style={[
                          styles.dayCell,
                          selected && styles.dayCellSelected,
                          today && !selected && styles.dayCellToday,
                          disabledDay && styles.dayCellDisabled,
                        ]}
                        disabled={disabledDay}
                        onPress={() => selectDay(item.dateObj)}
                      >
                        <Text
                          style={[
                            styles.dayCellText,
                            !item.isCurrentMonth && styles.dayCellTextMuted,
                            selected && styles.dayCellTextSelected,
                            today && !selected && styles.dayCellTextToday,
                            disabledDay && styles.dayCellTextDisabled,
                          ]}
                        >
                          {item.day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : viewMode === "years" ? (
              /* QUICK YEAR SELECTOR SCROLL */
              <View style={{ height: 260 }}>
                <Text style={styles.selectorHint}>Select Year:</Text>
                <ScrollView contentContainerStyle={styles.yearsGrid}>
                  {yearRange.map((yr) => (
                    <Pressable
                      key={yr}
                      style={[
                        styles.yearChip,
                        yr === viewYear && styles.yearChipSelected,
                      ]}
                      onPress={() => {
                        setViewYear(yr);
                        setViewMode("days");
                      }}
                    >
                      <Text
                        style={[
                          styles.yearChipText,
                          yr === viewYear && styles.yearChipTextSelected,
                        ]}
                      >
                        {yr}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : (
              /* QUICK MONTH SELECTOR */
              <View style={{ height: 260 }}>
                <Text style={styles.selectorHint}>Select Month:</Text>
                <View style={styles.monthsGrid}>
                  {MONTH_NAMES.map((m, idx) => (
                    <Pressable
                      key={m}
                      style={[
                        styles.monthChip,
                        idx === viewMonth && styles.monthChipSelected,
                      ]}
                      onPress={() => {
                        setViewMonth(idx);
                        setViewMode("days");
                      }}
                    >
                      <Text
                        style={[
                          styles.monthChipText,
                          idx === viewMonth && styles.monthChipTextSelected,
                        ]}
                      >
                        {m.slice(0, 3)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Modal Bottom Actions */}
            <View style={styles.modalBottomBar}>
              <Pressable
                style={styles.modalTodayBtn}
                onPress={() => selectDay(new Date())}
              >
                <Ionicons name="today-outline" size={14} color={colors.brandPrimary} />
                <Text style={styles.modalTodayBtnText}>Select Today</Text>
              </Pressable>

              <Pressable
                style={styles.modalDoneBtn}
                onPress={() => setModalOpen(false)}
              >
                <Text style={styles.modalDoneBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingLeft: 12,
    paddingRight: 6,
    height: 48,
  },
  fieldWrapError: {
    borderColor: "#DC2626",
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  clearBtn: {
    padding: 6,
  },
  calendarTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginLeft: 6,
  },
  calendarTriggerText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: colors.brandPrimary,
  },
  helperText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  errorText: {
    fontSize: 11,
    color: "#DC2626",
    marginTop: 4,
    fontWeight: "600",
  },

  /* MODAL */
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  calendarModal: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalHeaderTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalCloseBtn: {
    padding: 4,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  navSelectorsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navMonthYearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  navMonthYearText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  daysView: {
    width: "100%",
  },
  dayLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 6,
    backgroundColor: "#F8FAFC",
    borderRadius: radius.sm,
    marginBottom: 6,
  },
  dayLabelText: {
    width: 36,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
  },
  weekendLabel: {
    color: "#DC2626",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.brandPrimary,
  },
  dayCellSelected: {
    backgroundColor: colors.brandPrimary,
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayCellText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  dayCellTextMuted: {
    color: "#94A3B8",
  },
  dayCellTextToday: {
    color: colors.brandPrimary,
    fontWeight: "800",
  },
  dayCellTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  dayCellTextDisabled: {
    color: "#94A3B8",
  },
  selectorHint: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
  },
  yearsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 20,
  },
  yearChip: {
    width: "22%",
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  yearChipSelected: {
    backgroundColor: colors.brandPrimary,
  },
  yearChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  yearChipTextSelected: {
    color: "#FFFFFF",
  },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  monthChip: {
    width: "30%",
    paddingVertical: 12,
    borderRadius: radius.sm,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  monthChipSelected: {
    backgroundColor: colors.brandPrimary,
  },
  monthChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  monthChipTextSelected: {
    color: "#FFFFFF",
  },
  modalBottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  modalTodayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: "#FFF1F2",
  },
  modalTodayBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  modalDoneBtn: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  modalDoneBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
