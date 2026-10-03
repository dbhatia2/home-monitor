import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Pill } from "@/components/Chips";
import { DealCard } from "@/components/DealCard";
import { QuickSort } from "@/components/QuickSort";
import { Empty, ErrorState, Loading } from "@/components/States";
import { fetchFacets, fetchHomes } from "@/lib/api";
import { moneyShort } from "@/lib/format";
import { activeFilterCount, useStore } from "@/lib/prefs";
import { colors, radius, spacing } from "@/lib/theme";
import type { CityStats, Home } from "@/lib/types";

const PAGE_SIZE = 25;

const SORT_LABELS: Record<string, string> = {
  score: "Best match",
  price_drop: "Biggest drops",
  ppsf: "Best $/sqft",
  price: "Lowest price",
  price_desc: "Highest price",
  sqft: "Largest",
  newest: "Newest",
};

export default function DealsScreen() {
  const router = useRouter();
  const { prefs, setPrefs, savedIds, toggleSaved, ready } = useStore();

  const [cities, setCities] = useState<string[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [stats, setStats] = useState<CityStats[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow first page overwriting a newer filter's results.
  const requestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchFacets(controller.signal)
      .then((f) => setCities(f.cities))
      .catch(() => {
        // The homes response also carries a city list, so this is non-fatal.
      });
    return () => controller.abort();
  }, []);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      const id = ++requestId.current;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await fetchHomes(prefs, { limit: PAGE_SIZE, offset: 0 });
        if (id !== requestId.current) return;
        setHomes(res.homes);
        setStats(res.stats);
        setTotal(res.total);
        setHasMore(res.hasMore);
        if (res.cities?.length) setCities(res.cities);
      } catch (e) {
        if (id !== requestId.current) return;
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Unknown error");
        setHomes([]);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [prefs],
  );

  useEffect(() => {
    if (ready) void load("initial");
  }, [ready, load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const res = await fetchHomes(prefs, { limit: PAGE_SIZE, offset: homes.length });
      if (id !== requestId.current) return;
      setHomes((current) => [...current, ...res.homes]);
      setHasMore(res.hasMore);
    } catch {
      // Leave the list as-is; the user can pull to refresh.
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, loading, prefs, homes.length]);

  const cityStats =
    prefs.city !== "all" ? stats.find((s) => s.city === prefs.city) : undefined;
  const filterCount = activeFilterCount(prefs);

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
        >
          <Pill
            label="All cities"
            selected={prefs.city === "all"}
            onPress={() => setPrefs({ ...prefs, city: "all" })}
          />
          {cities.map((c) => (
            <Pill
              key={c}
              label={c}
              selected={prefs.city === c}
              onPress={() => setPrefs({ ...prefs, city: c })}
            />
          ))}
        </ScrollView>

        <QuickSort
          selected={prefs.sort}
          onSelect={(sort) => setPrefs({ ...prefs, sort })}
        />

        <View style={styles.metaRow}>
          <Text style={styles.count}>
            {loading ? "Searching…" : `${total} ${total === 1 ? "home" : "homes"}`}
            <Text style={styles.sortHint}>  ·  {SORT_LABELS[prefs.sort] ?? prefs.sort}</Text>
          </Text>

          <Pressable
            onPress={() => router.push("/filters")}
            style={({ pressed }) => [styles.filterBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Open filters"
          >
            <Ionicons name="options-outline" size={16} color={colors.text} />
            <Text style={styles.filterText}>Filters</Text>
            {filterCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{filterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {cityStats && (
          <View style={styles.stats}>
            <Stat label="Listings" value={String(cityStats.total)} />
            <Stat label="Move-in" value={String(cityStats.mir)} />
            <Stat label="Drops" value={String(cityStats.drops)} tone={colors.red} />
            <Stat label="Avg" value={moneyShort(cityStats.avg_price)} />
            <Stat label="$/sqft" value={`$${cityStats.avg_ppsf ?? 0}`} />
          </View>
        )}
      </View>

      {loading && !refreshing ? (
        <Loading label="Finding deals" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load("initial")} />
      ) : (
        <FlatList
          data={homes}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <DealCard
              home={item}
              saved={savedIds.includes(item.id)}
              onToggleSave={toggleSaved}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load("refresh")}
              tintColor={colors.green}
            />
          }
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <Empty
              title="No homes match"
              hint="Try widening your filters or picking a different city."
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.green} style={{ marginVertical: spacing.lg }} />
            ) : null
          }
        />
      )}
    </View>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, tone ? { color: tone } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  controls: {
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  pills: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  count: { color: colors.textMut, fontSize: 13, fontWeight: "600" },
  sortHint: { color: colors.textFaint, fontWeight: "400" },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  badge: {
    minWidth: 18,
    paddingHorizontal: 5,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#04150F", fontSize: 11, fontWeight: "800" },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: { alignItems: "center", flex: 1 },
  statValue: { color: colors.text, fontSize: 15, fontWeight: "800" },
  statLabel: { color: colors.textFaint, fontSize: 10, marginTop: 2 },
  list: { padding: spacing.lg, paddingBottom: 40 },
});
