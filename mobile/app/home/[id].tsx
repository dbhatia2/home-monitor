import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, Alert, Share } from "react-native";
import { Tag } from "@/components/Chips";
import { Button } from "@/components/Controls";
import { PriceChart } from "@/components/PriceChart";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ErrorState, Loading } from "@/components/States";
import { fetchHome } from "@/lib/api";
import { money, ppsf, shortDate, sqftLabel, specs } from "@/lib/format";
import { useStore } from "@/lib/prefs";
import { builderColor, colors, radius, spacing, statusColor, statusLabel } from "@/lib/theme";
import type { HomeDetail } from "@/lib/types";

export default function HomeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const homeId = Number(id);
  const { isSaved, toggleSaved } = useStore();

  const [home, setHome] = useState<HomeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchHome(homeId)
      .then(setHome)
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, [homeId]);

  useEffect(load, [load]);

  if (loading) return <Loading />;
  if (error || !home) {
    return <ErrorState message={error ?? "Home not found"} onRetry={load} />;
  }

  const perSqft = ppsf(home.price, home.sqft);
  const dropped = home.price_drop === 1 && home.price_drop_amt > 0;
  const previous = home.prev_price || home.was_price;
  const saved = isSaved(home.id);
  const link = home.home_url || home.community_url;

  const shareHome = async () => {
    const shareText = `${home.community} - ${home.city}
${money(home.price)}${perSqft ? ` • $${perSqft}/sqft` : ""}
${specs(home.beds, home.baths, home.sqft)}
${home.builder}${home.status ? ` • ${statusLabel(home.status)}` : ""}
${typeof home.score === "number" ? `\nValue Score: ${Math.round(home.score)}/100` : ""}${link ? `\n\n${link}` : ""}`;

    try {
      await Share.share({
        message: shareText,
        url: link || undefined,
        title: `${home.community} - ${home.city}`,
      });
    } catch (error) {
      // User cancelled or error occurred
      console.error('Error sharing:', error);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: home.community,
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 16 }}>
              <Pressable
                onPress={shareHome}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Share home"
              >
                <Ionicons
                  name="share-outline"
                  size={22}
                  color={colors.textMut}
                />
              </Pressable>
              <Pressable
                onPress={() => toggleSaved(home.id)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={saved ? "Remove from saved" : "Save home"}
              >
                <Ionicons
                  name={saved ? "heart" : "heart-outline"}
                  size={22}
                  color={saved ? colors.red : colors.textMut}
                />
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
        <View style={styles.tags}>
          <Tag label={home.builder} color={builderColor(home.builder, home.builder_color)} solid />
          <Tag label={statusLabel(home.status)} color={statusColor(home.status)} />
          {home.new_listing === 1 && <Tag label="NEW" color={colors.blue} />}
          {home.is_hotw === 1 && <Tag label="HOT HOME" color={colors.amber} />}
        </View>

        <Text style={styles.address}>{home.address}</Text>
        <Text style={styles.sub}>
          {home.community} · {home.city}
          {home.plan_name ? `  ·  Plan ${home.plan_name}` : ""}
          {home.homesite ? `  ·  Lot ${home.homesite}` : ""}
        </Text>

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <View style={styles.priceBlock}>
              <Text style={[styles.price, dropped && { color: colors.red }]}>
                {money(home.price)}
              </Text>
              {dropped && previous ? (
                <Text style={styles.dropLine}>
                  <Text style={styles.strike}>{money(previous)}</Text>
                  {"   "}
                  <Text style={styles.dropAmt}>-{money(home.price_drop_amt)}</Text>
                </Text>
              ) : null}
            </View>
            {typeof home.score === "number" && (
              <ScoreBadge score={home.score} size="large" />
            )}
          </View>
          {perSqft && (
            <Text style={styles.ppsf}>${perSqft}/sqft</Text>
          )}
        </View>

        <View style={styles.specGrid}>
          <Spec label="Beds" value={home.beds ? String(home.beds) : "—"} />
          <Spec label="Baths" value={home.baths ?? "—"} />
          <Spec label="Size" value={sqftLabel(home.sqft)} />
          <Spec label="$/sqft" value={perSqft ? `$${perSqft}` : "—"} />
        </View>

        {home.schools.length > 0 && (
          <Block title="Schools">
            {home.schools.map((s) => (
              <View key={s.name} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {s.name}
                  </Text>
                  <Text style={styles.rowSub}>
                    {[s.grades, s.type, s.distance].filter(Boolean).join(" · ") || "—"}
                    {s.approximate ? "  (approx)" : ""}
                  </Text>
                </View>
                {s.rating_gs ? (
                  <View style={styles.rating}>
                    <Text style={styles.ratingText}>{s.rating_gs}/10</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </Block>
        )}

        {home.price_history.length > 0 && (
          <PriceChart priceHistory={home.price_history} />
        )}

        <Block title="Tracking">
          <View style={styles.row}>
            <Text style={styles.rowSub}>First seen</Text>
            <Text style={styles.rowTitle}>{shortDate(home.first_seen_at)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowSub}>Last seen</Text>
            <Text style={styles.rowTitle}>{shortDate(home.last_seen_at)}</Text>
          </View>
        </Block>

        {link ? (
          <Button
            label={`Open on ${home.builder}`}
            onPress={() => void WebBrowser.openBrowserAsync(link)}
          />
        ) : null}
      </ScrollView>
    </>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.spec}>
      <Text style={styles.specValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.specLabel}>{label}</Text>
    </View>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <View style={styles.blockBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.xl, paddingBottom: 48, gap: spacing.md },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  address: { color: colors.text, fontSize: 20, fontWeight: "800", lineHeight: 26 },
  sub: { color: colors.textFaint, fontSize: 13, lineHeight: 18 },
  priceCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  priceBlock: {
    flex: 1,
    gap: 4,
  },
  price: { color: colors.text, fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  dropLine: { fontSize: 14 },
  strike: { color: colors.textFaint, textDecorationLine: "line-through" },
  dropAmt: { color: colors.red, fontWeight: "700" },
  ppsf: { color: colors.textMut, fontSize: 15, fontWeight: "600" },
  specGrid: { flexDirection: "row", gap: spacing.sm },
  spec: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  specValue: { color: colors.text, fontSize: 14, fontWeight: "700" },
  specLabel: { color: colors.textFaint, fontSize: 10, marginTop: 2 },
  block: { gap: spacing.sm, marginTop: spacing.sm },
  blockTitle: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  blockBody: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: { flexShrink: 1, gap: 2 },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: "600" },
  rowSub: { color: colors.textFaint, fontSize: 12 },
  rating: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: `${colors.green}22`,
  },
  ratingText: { color: colors.green, fontSize: 12, fontWeight: "800" },
});
