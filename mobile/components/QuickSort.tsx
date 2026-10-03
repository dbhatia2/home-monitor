import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";
import type { SortKey } from "@/lib/types";

interface SortOption {
  key: SortKey;
  label: string;
  icon?: string;
}

const QUICK_SORTS: SortOption[] = [
  { key: "score", label: "Best Value" },
  { key: "price_drop", label: "Price Drops" },
  { key: "ppsf", label: "Best $/sqft" },
  { key: "newest", label: "Newest" },
  { key: "price", label: "Lowest Price" },
];

interface QuickSortProps {
  selected: SortKey;
  onSelect: (sort: SortKey) => void;
}

export function QuickSort({ selected, onSelect }: QuickSortProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {QUICK_SORTS.map((option) => {
        const isSelected = selected === option.key;
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            style={({ pressed }) => [
              styles.tab,
              isSelected && styles.tabSelected,
              pressed && styles.tabPressed,
            ]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabSelected: {
    backgroundColor: colors.green + "20",
    borderColor: colors.green,
  },
  tabPressed: {
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
