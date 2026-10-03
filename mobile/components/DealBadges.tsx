import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";

interface BadgeProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}

function Badge({ icon, label, color }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color + "20", borderColor: color }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

interface DealBadgesProps {
  priceDropAmt?: number;
  isMoveInReady?: boolean;
  isNewListing?: boolean;
}

export function DealBadges({ priceDropAmt, isMoveInReady, isNewListing }: DealBadgesProps) {
  const badges: BadgeProps[] = [];

  if (priceDropAmt && priceDropAmt > 0) {
    badges.push({
      icon: "trending-down",
      label: `$${Math.round(priceDropAmt / 1000)}K Drop`,
      color: colors.priceDrop,
    });
  }

  if (isMoveInReady) {
    badges.push({
      icon: "flash",
      label: "Move-in Ready",
      color: colors.moveInReady,
    });
  }

  if (isNewListing) {
    badges.push({
      icon: "sparkles",
      label: "New Listing",
      color: colors.newListing,
    });
  }

  if (badges.length === 0) return null;

  return (
    <View style={styles.container}>
      {badges.map((badge, idx) => (
        <Badge key={idx} {...badge} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
  },
});
