import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Tag } from "@/components/Chips";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ErrorState, Loading } from "@/components/States";
import { fetchHome } from "@/lib/api";
import { money, ppsf } from "@/lib/format";
import { builderColor, colors, fontWeights, radius, spacing } from "@/lib/theme";
import type { HomeDetail } from "@/lib/types";

export default function CompareScreen() {
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const router = useRouter();
  const homeIds = ids ? ids.split(",").map(Number) : [];

  const [homes, setHomes] = useState<HomeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!homeIds.length) {
      setError("No homes selected for comparison");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(homeIds.map((id) => fetchHome(id)));
      setHomes(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load homes");
    } finally {
      setLoading(false);
    }
  }, [homeIds.join(",")]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading label="Loading comparison" />;
  if (error || !homes.length) {
    return <ErrorState message={error ?? "No homes to compare"} onRetry={() => void load()} />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Compare (${homes.length})`,
          presentation: "modal",
        }}
      />

      <ScrollView style={styles.screen}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.table}>
            {/* Header Row */}
            <View style={styles.row}>
              <View style={[styles.cell, styles.labelCell]}>
                <Text style={styles.labelText}>Property</Text>
              </View>
              {homes.map((home) => (
                <View key={home.id} style={[styles.cell, styles.headerCell]}>
                  <View style={styles.homeHeader}>
                    <Text style={styles.communityText} numberOfLines={2}>
                      {home.community}
                    </Text>
                    <Text style={styles.cityText}>{home.city}</Text>
                    {typeof home.score === "number" && (
                      <ScoreBadge score={home.score} size="small" />
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Price Row */}
            <CompareRow
              label="Price"
              values={homes.map((h) => ({
                text: money(h.price),
                highlight: h.price === Math.min(...homes.map((x) => x.price)),
                tone: colors.green,
              }))}
            />

            {/* Price per sqft Row */}
            <CompareRow
              label="$/sqft"
              values={homes.map((h) => {
                const val = ppsf(h.price, h.sqft);
                const allPpsf = homes
                  .map((x) => ppsf(x.price, x.sqft))
                  .filter((x): x is number => x !== null);
                return {
                  text: val ? `$${val}` : "—",
                  highlight: val !== null && val === Math.min(...allPpsf),
                  tone: colors.green,
                };
              })}
            />

            {/* Beds Row */}
            <CompareRow
              label="Bedrooms"
              values={homes.map((h) => ({
                text: h.beds ? String(h.beds) : "—",
                highlight: false,
              }))}
            />

            {/* Baths Row */}
            <CompareRow
              label="Bathrooms"
              values={homes.map((h) => ({
                text: h.baths ?? "—",
                highlight: false,
              }))}
            />

            {/* Sqft Row */}
            <CompareRow
              label="Size"
              values={homes.map((h) => {
                const allSqft = homes.map((x) => x.sqft ?? 0).filter((x) => x > 0);
                return {
                  text: h.sqft ? `${h.sqft.toLocaleString()} sqft` : "—",
                  highlight: h.sqft !== null && h.sqft === Math.max(...allSqft),
                  tone: colors.blue,
                };
              })}
            />

            {/* Builder Row */}
            <CompareRow
              label="Builder"
              values={homes.map((h) => ({
                text: h.builder,
                highlight: false,
              }))}
            />

            {/* Status Row */}
            <CompareRow
              label="Status"
              values={homes.map((h) => ({
                text: h.status.replace(/_/g, " "),
                highlight: h.status === "MOVE_IN_READY" || h.status === "QUICK_MOVE_IN",
                tone: colors.green,
              }))}
            />

            {/* Price Drop Row */}
            <CompareRow
              label="Price Drop"
              values={homes.map((h) => {
                const dropped = h.price_drop === 1 && h.price_drop_amt > 0;
                return {
                  text: dropped ? `-${money(h.price_drop_amt)}` : "None",
                  highlight: dropped,
                  tone: colors.red,
                };
              })}
            />

            {/* Schools Row */}
            <CompareRow
              label="Top School"
              values={homes.map((h) => {
                const topSchool = h.schools
                  .filter((s) => s.rating_gs !== null)
                  .sort((a, b) => (b.rating_gs ?? 0) - (a.rating_gs ?? 0))[0];
                return {
                  text: topSchool ? `${topSchool.rating_gs}/10` : "—",
                  highlight: false,
                };
              })}
            />
          </View>
        </ScrollView>

        <View style={styles.actions}>
          {homes.map((home) => (
            <Pressable
              key={home.id}
              onPress={() => {
                router.back();
                router.push(`/home/${home.id}`);
              }}
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
            >
              <Text style={styles.actionText} numberOfLines={1}>
                View {home.community}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.text} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

interface CompareRowProps {
  label: string;
  values: Array<{
    text: string;
    highlight: boolean;
    tone?: string;
  }>;
}

function CompareRow({ label, values }: CompareRowProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.cell, styles.labelCell]}>
        <Text style={styles.labelText}>{label}</Text>
      </View>
      {values.map((val, idx) => (
        <View key={idx} style={[styles.cell, styles.valueCell]}>
          <Text
            style={[
              styles.valueText,
              val.highlight && styles.highlightText,
              val.tone && { color: val.tone },
            ]}
          >
            {val.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

const CELL_WIDTH = 150;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  table: {
    padding: spacing.lg,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cell: {
    padding: spacing.md,
    justifyContent: "center",
  },
  labelCell: {
    width: 120,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  labelText: {
    color: colors.textMut,
    fontSize: 13,
    fontWeight: fontWeights.semiBold,
  },
  headerCell: {
    width: CELL_WIDTH,
    backgroundColor: colors.surfaceHi,
    alignItems: "center",
  },
  homeHeader: {
    gap: 4,
    alignItems: "center",
  },
  communityText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: fontWeights.bold,
    textAlign: "center",
  },
  cityText: {
    color: colors.textFaint,
    fontSize: 11,
  },
  valueCell: {
    width: CELL_WIDTH,
    alignItems: "center",
  },
  valueText: {
    color: colors.text,
    fontSize: 14,
    textAlign: "center",
  },
  highlightText: {
    fontWeight: fontWeights.bold,
  },
  actions: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: fontWeights.semiBold,
    flex: 1,
  },
});
