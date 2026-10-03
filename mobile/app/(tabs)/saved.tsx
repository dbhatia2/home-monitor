import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { DealCard } from "@/components/DealCard";
import { Empty, ErrorState, Loading } from "@/components/States";
import { fetchHome } from "@/lib/api";
import { useStore } from "@/lib/prefs";
import { colors, fontWeights, radius, spacing } from "@/lib/theme";
import type { Home, HomeDetail } from "@/lib/types";

type SortOption = "score" | "price" | "priceDrop" | "newest";

export default function SavedScreen() {
  const { savedIds, toggleSaved, ready } = useStore();
  const router = useRouter();

  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const load = useCallback(async () => {
    if (!savedIds.length) {
      setHomes([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Saved lists are small, so fetching each detail is cheaper than adding
      // a bulk endpoint. A home that has since sold simply drops out.
      const results = await Promise.allSettled(savedIds.map((id) => fetchHome(id)));
      const ok = results
        .filter((r): r is PromiseFulfilledResult<HomeDetail> => r.status === "fulfilled")
        .map((r) => r.value as Home);

      if (!ok.length && results.length) {
        setError("Could not load your saved homes.");
      }
      setHomes(ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [savedIds]);

  // Refresh on focus so hearts toggled on the Deals tab are reflected here.
  useFocusEffect(
    useCallback(() => {
      if (ready) void load();
    }, [ready, load]),
  );

  if (loading) return <Loading label="Loading saved homes" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  // Sort homes
  const sorted = [...homes].sort((a, b) => {
    switch (sortBy) {
      case "score":
        return (b.score ?? 0) - (a.score ?? 0);
      case "price":
        return a.price - b.price;
      case "priceDrop":
        return b.price_drop_amt - a.price_drop_amt;
      case "newest":
        return b.new_listing - a.new_listing;
      default:
        return 0;
    }
  });

  // Group by city
  const grouped = sorted.reduce((acc, home) => {
    const city = home.city;
    if (!acc[city]) acc[city] = [];
    acc[city].push(home);
    return acc;
  }, {} as Record<string, Home[]>);

  const sections = Object.entries(grouped).map(([city, data]) => ({
    title: city,
    data,
  }));

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: "score", label: "Best Value" },
    { key: "price", label: "Price" },
    { key: "priceDrop", label: "Price Drop" },
    { key: "newest", label: "Newest" },
  ];

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const startCompare = () => {
    if (selectedIds.length >= 2) {
      router.push(`/compare?ids=${selectedIds.join(",")}`);
      setCompareMode(false);
      setSelectedIds([]);
    }
  };

  const cancelCompare = () => {
    setCompareMode(false);
    setSelectedIds([]);
  };

  return (
    <View style={styles.screen}>
      {homes.length > 0 && (
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.count}>{homes.length} saved</Text>
            {!compareMode && homes.length >= 2 && (
              <Pressable
                onPress={() => setCompareMode(true)}
                style={({ pressed }) => [styles.compareBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="git-compare" size={16} color={colors.text} />
                <Text style={styles.compareBtnText}>Compare</Text>
              </Pressable>
            )}
          </View>

          {compareMode ? (
            <View style={styles.compareActions}>
              <Text style={styles.compareHint}>
                Select 2-4 homes to compare ({selectedIds.length} selected)
              </Text>
              <View style={styles.compareButtons}>
                <Pressable
                  onPress={cancelCompare}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.cancelButton,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={startCompare}
                  disabled={selectedIds.length < 2 || selectedIds.length > 4}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.compareButton,
                    (selectedIds.length < 2 || selectedIds.length > 4) && styles.disabledButton,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.compareButtonText,
                      (selectedIds.length < 2 || selectedIds.length > 4) && styles.disabledText,
                    ]}
                  >
                    Compare
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.sortTabs}>
              {sortOptions.map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => setSortBy(option.key)}
                  style={[
                    styles.sortTab,
                    sortBy === option.key && styles.sortTabSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.sortLabel,
                      sortBy === option.key && styles.sortLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) =>
          compareMode ? (
            <Pressable
              onPress={() => toggleSelection(item.id)}
              style={({ pressed }) => [
                styles.compareItem,
                pressed && { opacity: 0.7 },
                selectedIds.includes(item.id) && styles.compareItemSelected,
              ]}
            >
              <View style={styles.checkbox}>
                {selectedIds.includes(item.id) && (
                  <Ionicons name="checkmark" size={18} color={colors.green} />
                )}
              </View>
              <View style={styles.compareItemContent}>
                <DealCard home={item} saved onToggleSave={toggleSaved} />
              </View>
            </Pressable>
          ) : (
            <DealCard home={item} saved onToggleSave={toggleSaved} />
          )
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {section.title} ({section.data.length})
            </Text>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Empty
            icon="heart-outline"
            title="Nothing saved yet"
            hint="Tap the heart on any listing to keep an eye on it."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  count: {
    color: colors.textMut,
    fontSize: 14,
    fontWeight: fontWeights.semiBold,
  },
  compareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compareBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: fontWeights.semiBold,
  },
  compareActions: {
    gap: spacing.sm,
  },
  compareHint: {
    color: colors.textFaint,
    fontSize: 12,
  },
  compareButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.textMut,
    fontSize: 13,
    fontWeight: fontWeights.semiBold,
  },
  compareButton: {
    backgroundColor: colors.green,
    borderWidth: 1,
    borderColor: colors.green,
  },
  compareButtonText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: fontWeights.bold,
  },
  disabledButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  disabledText: {
    color: colors.textFaint,
  },
  sortTabs: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  sortTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortTabSelected: {
    backgroundColor: colors.green + "20",
    borderColor: colors.green,
  },
  sortLabel: {
    color: colors.textMut,
    fontSize: 12,
    fontWeight: fontWeights.semiBold,
  },
  sortLabelSelected: {
    color: colors.green,
    fontWeight: fontWeights.bold,
  },
  compareItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  compareItemSelected: {
    backgroundColor: colors.green + "10",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  compareItemContent: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: fontWeights.bold,
  },
  list: { paddingBottom: 40 },
});
