import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Tag } from "@/components/Chips";
import { DealBadges } from "@/components/DealBadges";
import { ScoreBadge } from "@/components/ScoreBadge";
import { money, ppsf, specs } from "@/lib/format";
import { builderColor, colors, radius, spacing, statusColor, statusLabel } from "@/lib/theme";
import type { Home } from "@/lib/types";

function DealCardBase({
  home,
  saved,
  onToggleSave,
}: {
  home: Home;
  saved: boolean;
  onToggleSave: (id: number) => void;
}) {
  const perSqft = ppsf(home.price, home.sqft);
  const dropped = home.price_drop === 1 && home.price_drop_amt > 0;
  const previous = home.prev_price || home.was_price;
  const isMoveInReady = home.status === "MOVE_IN_READY" || home.status === "QUICK_MOVE_IN";

  return (
    <Link href={`/home/${home.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.topRow}>
          <View style={styles.tags}>
            <Tag label={home.builder} color={builderColor(home.builder, home.builder_color)} solid />
            {home.is_hotw === 1 && <Tag label="HOT" color={colors.amber} />}
          </View>

          <View style={styles.topRight}>
            {typeof home.score === "number" && <ScoreBadge score={home.score} size="small" />}
            <Pressable
              hitSlop={10}
              onPress={(e) => {
                e.stopPropagation();
                onToggleSave(home.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={saved ? "Remove from saved" : "Save home"}
            >
              <Ionicons
                name={saved ? "heart" : "heart-outline"}
                size={20}
                color={saved ? colors.red : colors.textFaint}
              />
            </Pressable>
          </View>
        </View>

        <Text style={styles.community} numberOfLines={1}>
          {home.community} · {home.city}
        </Text>

        <View style={styles.priceBlock}>
          <Text style={[styles.price, dropped && { color: colors.red }]}>
            {money(home.price)}
          </Text>
          {dropped && previous ? (
            <Text style={styles.was}>
              <Text style={styles.strike}>{money(previous)}</Text>
              {"  "}
              <Text style={styles.dropAmt}>-{money(home.price_drop_amt)}</Text>
            </Text>
          ) : null}
          {perSqft ? (
            <Text style={styles.ppsf}>
              ${perSqft}/sqft
            </Text>
          ) : null}
        </View>

        <Text style={styles.specs}>{specs(home.beds, home.baths, home.sqft)}</Text>

        <DealBadges
          priceDropAmt={dropped ? home.price_drop_amt : undefined}
          isMoveInReady={isMoveInReady}
          isNewListing={home.new_listing === 1}
        />

        <View style={styles.bottomRow}>
          <Text style={styles.address} numberOfLines={1}>
            {home.address}
          </Text>
          <Tag label={statusLabel(home.status)} color={statusColor(home.status)} />
        </View>
      </Pressable>
    </Link>
  );
}

export const DealCard = memo(DealCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: 6,
  },
  pressed: { opacity: 0.75 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  tags: { flexDirection: "row", gap: 6, flexShrink: 1, flexWrap: "wrap" },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  community: { color: colors.textFaint, fontSize: 12 },
  priceBlock: { flexShrink: 1 },
  price: { color: colors.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  was: { fontSize: 12, marginTop: 2 },
  strike: { color: colors.textFaint, textDecorationLine: "line-through" },
  dropAmt: { color: colors.red, fontWeight: "700" },
  ppsf: { color: colors.textMut, fontSize: 13, marginTop: 2, fontWeight: "600" },
  specs: { color: colors.textMut, fontSize: 14, fontWeight: "600" },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: 2,
  },
  address: { color: colors.textFaint, fontSize: 11, flexShrink: 1 },
});
