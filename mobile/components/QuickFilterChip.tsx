import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";

interface QuickFilterChipProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
}

export function QuickFilterChip({ label, icon, selected, onPress }: QuickFilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? colors.green : colors.textMut}
        />
      )}
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.green + "20",
    borderColor: colors.green,
  },
  chipPressed: {
    opacity: 0.7,
  },
  label: {
    color: colors.textMut,
    fontSize: 13,
    fontWeight: "600",
  },
  labelSelected: {
    color: colors.green,
    fontWeight: "700",
  },
});
