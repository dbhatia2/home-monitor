import { ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** Single-select row of options. */
export function Choice<T extends string | number | null>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipOn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Multi-select row of options. */
export function MultiChoice({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const selected = values.includes(o);
        return (
          <Pressable
            key={o}
            onPress={() =>
              onChange(selected ? values.filter((v) => v !== o) : [...values, o])
            }
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipOn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextOn]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.toggleHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.green }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        variant === "primary" ? styles.buttonPrimary : styles.buttonGhost,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "primary" ? styles.buttonTextPrimary : styles.buttonTextGhost,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, marginBottom: spacing.xl },
  sectionTitle: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { color: colors.textMut, fontSize: 13, fontWeight: "600" },
  chipTextOn: { color: "#04150F" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    gap: spacing.lg,
  },
  toggleText: { flexShrink: 1, gap: 2 },
  toggleLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  toggleHint: { color: colors.textFaint, fontSize: 12 },
  button: {
    paddingVertical: 14,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  buttonPrimary: { backgroundColor: colors.green },
  buttonGhost: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  buttonText: { fontSize: 15, fontWeight: "800" },
  buttonTextPrimary: { color: "#04150F" },
  buttonTextGhost: { color: colors.textMut },
});
