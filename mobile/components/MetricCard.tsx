import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSizes, fontWeights, radius, spacing } from "@/lib/theme";

interface MetricCardProps {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  trend?: "up" | "down" | "neutral";
  color?: string;
}

export function MetricCard({ label, value, icon, trend, color = colors.text }: MetricCardProps) {
  const trendIcon = trend === "up" ? "trending-up" : trend === "down" ? "trending-down" : null;
  const trendColor = trend === "up" ? colors.green : trend === "down" ? colors.red : colors.textFaint;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {icon && <Ionicons name={icon} size={16} color={colors.textMut} />}
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color }]}>{value}</Text>
        {trendIcon && (
          <Ionicons name={trendIcon} size={20} color={trendColor} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    minWidth: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: fontWeights.semiBold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  value: {
    fontSize: fontSizes.metric,
    fontWeight: fontWeights.black,
    letterSpacing: -1,
  },
});
