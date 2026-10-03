import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DealSpotlight } from "@/components/DealSpotlight";
import { MetricCard } from "@/components/MetricCard";
import { ErrorState, Loading } from "@/components/States";
import { fetchHomes } from "@/lib/api";
import { moneyShort } from "@/lib/format";
import { useStore } from "@/lib/prefs";
import { colors, fontWeights, spacing } from "@/lib/theme";
import type { CityStats, Home } from "@/lib/types";

export default function DashboardScreen() {
  const { prefs, ready } = useStore();

  const [topHomes, setTopHomes] = useState<Home[]>([]);
  const [stats, setStats] = useState<CityStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        // Fetch top 3 homes by score
        const res = await fetchHomes(
          { ...prefs, sort: "score" },
          { limit: 3, offset: 0 }
        );
        setTopHomes(res.homes);
        setStats(res.stats);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [prefs]
  );

  useEffect(() => {
    if (ready) void load("initial");
  }, [ready, load]);

  // Aggregate stats across all cities
  const totalStats = stats.reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      mir: acc.mir + s.mir,
      drops: acc.drops + s.drops,
      avgPrice: acc.avgPrice + s.avg_price * s.total,
      avgPpsf: acc.avgPpsf + s.avg_ppsf * s.total,
      count: acc.count + s.total,
    }),
    { total: 0, mir: 0, drops: 0, avgPrice: 0, avgPpsf: 0, count: 0 }
  );

  const avgPrice = totalStats.count > 0 ? totalStats.avgPrice / totalStats.count : 0;
  const avgPpsf = totalStats.count > 0 ? Math.round(totalStats.avgPpsf / totalStats.count) : 0;

  if (loading && !refreshing) {
    return <Loading label="Loading market overview" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load("initial")} />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load("refresh")}
          tintColor={colors.green}
        />
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Market Overview</Text>
        <View style={styles.metricsRow}>
          <MetricCard
            label="Active"
            value={String(totalStats.total)}
            icon="home"
            color={colors.blue}
          />
          <MetricCard
            label="Move-in"
            value={String(totalStats.mir)}
            icon="flash"
            color={colors.green}
          />
        </View>
        <View style={styles.metricsRow}>
          <MetricCard
            label="Drops"
            value={String(totalStats.drops)}
            icon="trending-down"
            color={colors.red}
          />
          <MetricCard
            label="Avg Price"
            value={moneyShort(avgPrice)}
            icon="pricetag"
          />
        </View>
        <View style={styles.metricsRow}>
          <MetricCard
            label="Avg $/sqft"
            value={`$${avgPpsf}`}
            icon="resize"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Best Value This Week</Text>
        {topHomes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No homes match your filters</Text>
          </View>
        ) : (
          <View style={styles.spotlights}>
            {topHomes.map((home, idx) => (
              <DealSpotlight key={home.id} home={home} rank={idx + 1} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By City</Text>
        <View style={styles.cityStats}>
          {stats.map((stat) => (
            <View key={stat.city} style={styles.cityStat}>
              <View style={styles.cityHeader}>
                <Text style={styles.cityName}>{stat.city}</Text>
                <Text style={styles.cityCount}>{stat.total} homes</Text>
              </View>
              <View style={styles.cityMetrics}>
                <View style={styles.cityMetric}>
                  <Text style={styles.metricLabel}>Move-in</Text>
                  <Text style={styles.metricValue}>{stat.mir}</Text>
                </View>
                <View style={styles.cityMetric}>
                  <Text style={styles.metricLabel}>Drops</Text>
                  <Text style={[styles.metricValue, { color: colors.red }]}>{stat.drops}</Text>
                </View>
                <View style={styles.cityMetric}>
                  <Text style={styles.metricLabel}>Avg</Text>
                  <Text style={styles.metricValue}>{moneyShort(stat.avg_price)}</Text>
                </View>
                <View style={styles.cityMetric}>
                  <Text style={styles.metricLabel}>$/sqft</Text>
                  <Text style={styles.metricValue}>${stat.avg_ppsf}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: 40,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: fontWeights.black,
    letterSpacing: -0.5,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  spotlights: {
    gap: spacing.md,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textFaint,
    fontSize: 14,
  },
  cityStats: {
    gap: spacing.md,
  },
  cityStat: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cityName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: fontWeights.bold,
  },
  cityCount: {
    color: colors.textFaint,
    fontSize: 13,
  },
  cityMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cityMetric: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  metricLabel: {
    color: colors.textFaint,
    fontSize: 10,
    textTransform: "uppercase",
  },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: fontWeights.bold,
  },
});
