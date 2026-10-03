import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/lib/theme";

export function Pill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.pill,
        selected && styles.pillOn,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.pillText, selected && styles.pillTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Small non-interactive label, e.g. builder name or status. */
export function Tag({
  label,
  color,
  solid = false,
}: {
  label: string;
  color: string;
  solid?: boolean;
}) {
  return (
    <View
      style={[
        styles.tag,
        solid ? { backgroundColor: color } : { backgroundColor: `${color}22` },
      ]}
    >
      <Text style={[styles.tagText, { color: solid ? "#FFFFFF" : color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillOn: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  pressed: { opacity: 0.7 },
  pillText: {
    color: colors.textMut,
    fontSize: 13,
    fontWeight: "600",
  },
  pillTextOn: { color: "#04150F" },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
