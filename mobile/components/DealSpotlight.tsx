import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScoreBadge } from "@/components/ScoreBadge";
import { money } from "@/lib/format";
import { colors, fontWeights, radius, spacing } from "@/lib/theme";
import type { Home } from "@/lib/types";

interface DealSpotlightProps {
  home: Home;
  rank: number;
}

export function DealSpotlight({ home, rank }: DealSpotlightProps) {
  const priceDropAmt = home.price_drop === 1 && home.price_drop_amt > 0 ? home.price_drop_amt : null;

  return (
    <Link href={`/home/${home.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.header}>
          <View style={styles.rank}>
            <Text style={styles.rankText}>#{rank}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.community} numberOfLines={1}>
              {home.community}
            </Text>
            <Text style={styles.location} numberOfLines={1}>
              {home.city} · {home.builder}
            </Text>
          </View>
          {typeof home.score === "number" && (
            <ScoreBadge score={home.score} size="small" />
          )}
        </View>

        <View style={styles.details}>
          <Text style={styles.price}>{money(home.price)}</Text>
          {priceDropAmt && (
            <Text style={styles.drop}>
              ↓ {money(priceDropAmt)} drop
            </Text>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rank: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.green + "20",
    borderWidth: 2,
    borderColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: fontWeights.black,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  community: {
    color: colors.text,
    fontSize: 15,
    fontWeight: fontWeights.bold,
  },
  location: {
    color: colors.textFaint,
    fontSize: 12,
  },
  details: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginLeft: 44, // Align with community text
  },
  price: {
    color: colors.text,
    fontSize: 18,
    fontWeight: fontWeights.extraBold,
  },
  drop: {
    color: colors.priceDrop,
    fontSize: 13,
    fontWeight: fontWeights.semiBold,
  },
});
