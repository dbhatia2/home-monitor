import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Choice, MultiChoice, Section, Toggle } from "@/components/Controls";
import { QuickFilterChip } from "@/components/QuickFilterChip";
import { fetchFacets } from "@/lib/api";
import { moneyShort } from "@/lib/format";
import { useStore } from "@/lib/prefs";
import { colors, fontWeights, radius, spacing } from "@/lib/theme";
import { DEFAULT_PREFS, type Prefs, type SortKey } from "@/lib/types";

const BEDS = [
  { label: "Any", value: 0 },
  { label: "2+", value: 2 },
  { label: "3+", value: 3 },
  { label: "4+", value: 4 },
  { label: "5+", value: 5 },
];

const BATHS = [
  { label: "Any", value: 0 },
  { label: "2+", value: 2 },
  { label: "2.5+", value: 2.5 },
  { label: "3+", value: 3 },
];

const PRICES: { label: string; value: number | null }[] = [
  { label: "Any", value: null },
  { label: "< $700K", value: 700_000 },
  { label: "< $800K", value: 800_000 },
  { label: "< $900K", value: 900_000 },
  { label: "< $1M", value: 1_000_000 },
  { label: "< $1.2M", value: 1_200_000 },
];

const SQFT: { label: string; value: number | null }[] = [
  { label: "Any", value: null },
  { label: "1500+", value: 1500 },
  { label: "1800+", value: 1800 },
  { label: "2200+", value: 2200 },
  { label: "2600+", value: 2600 },
];

const SORTS: { label: string; value: SortKey }[] = [
  { label: "Best match", value: "score" },
  { label: "Biggest drops", value: "price_drop" },
  { label: "Best $/sqft", value: "ppsf" },
  { label: "Lowest price", value: "price" },
  { label: "Largest", value: "sqft" },
  { label: "Newest", value: "newest" },
];

export default function FiltersScreen() {
  const router = useRouter();
  const { prefs, setPrefs, savePrefsAsDefault, savedSearches, saveSearch, loadSearch, deleteSearch } = useStore();

  // Edited locally so backing out of the sheet discards changes.
  const [draft, setDraft] = useState<Prefs>(prefs);
  const [builders, setBuilders] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchFacets(controller.signal)
      .then((f) => setBuilders(f.builders.map((b) => b.name)))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const patch = (p: Partial<Prefs>) => setDraft((d) => ({ ...d, ...p }));

  const apply = () => {
    setPrefs(draft);
    router.back();
  };

  const saveDefault = async () => {
    await savePrefsAsDefault(draft);
    router.back();
  };

  const handleSaveSearch = () => {
    Alert.prompt(
      "Save Search",
      "Give this search a name",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async (name) => {
            if (name && name.trim()) {
              await saveSearch(name.trim(), draft);
              Alert.alert("Saved", `Search "${name}" has been saved`);
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const handleLoadSearch = (id: string, name: string) => {
    Alert.alert(
      "Load Search",
      `Load "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Load",
          onPress: () => {
            loadSearch(id);
            setDraft(savedSearches.find((s) => s.id === id)?.prefs ?? draft);
          },
        },
      ]
    );
  };

  const handleDeleteSearch = (id: string, name: string) => {
    Alert.alert(
      "Delete Search",
      `Delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSearch(id);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {savedSearches.length > 0 && (
          <Section title="Saved Searches">
            <View style={styles.savedSearches}>
              {savedSearches.map((search) => (
                <View key={search.id} style={styles.savedSearch}>
                  <Pressable
                    onPress={() => handleLoadSearch(search.id, search.name)}
                    style={({ pressed }) => [
                      styles.searchButton,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Ionicons name="search" size={16} color={colors.textMut} />
                    <Text style={styles.searchName}>{search.name}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteSearch(search.id, search.name)}
                    hitSlop={10}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.red} />
                  </Pressable>
                </View>
              ))}
            </View>
          </Section>
        )}

        <Section title="Quick Filters">
          <View style={styles.quickFilters}>
            <QuickFilterChip
              label="Price Drops"
              icon="trending-down"
              selected={draft.priceDropOnly}
              onPress={() => patch({ priceDropOnly: !draft.priceDropOnly })}
            />
            <QuickFilterChip
              label="Move-in Ready"
              icon="flash"
              selected={draft.mirOnly}
              onPress={() => patch({ mirOnly: !draft.mirOnly })}
            />
            <QuickFilterChip
              label="New Listings"
              icon="sparkles"
              selected={draft.newOnly}
              onPress={() => patch({ newOnly: !draft.newOnly })}
            />
            <QuickFilterChip
              label="3+ Beds"
              icon="bed"
              selected={draft.minBeds >= 3}
              onPress={() => patch({ minBeds: draft.minBeds >= 3 ? 0 : 3 })}
            />
          </View>
        </Section>

        <Section title="Bedrooms">
          <Choice options={BEDS} value={draft.minBeds} onChange={(v) => patch({ minBeds: v })} />
        </Section>

        <Section title="Bathrooms">
          <Choice
            options={BATHS}
            value={draft.minBaths}
            onChange={(v) => patch({ minBaths: v })}
          />
        </Section>

        <Section title="Max price">
          <Choice
            options={PRICES}
            value={draft.maxPrice}
            onChange={(v) => patch({ maxPrice: v })}
          />
        </Section>

        <Section title="Min size">
          <Choice options={SQFT} value={draft.minSqft} onChange={(v) => patch({ minSqft: v })} />
        </Section>

        {builders.length > 0 && (
          <Section title="Builders">
            <MultiChoice
              options={builders}
              values={draft.builders}
              onChange={(v) => patch({ builders: v })}
            />
            <Text style={styles.hint}>No selection means all builders.</Text>
          </Section>
        )}

        <Section title="Only show">
          <Toggle
            label="Price drops"
            hint="Homes that got cheaper since the last scrape"
            value={draft.priceDropOnly}
            onChange={(v) => patch({ priceDropOnly: v })}
          />
          <Toggle
            label="Move-in ready"
            hint="Finished homes you can close on now"
            value={draft.mirOnly}
            onChange={(v) => patch({ mirOnly: v })}
          />
          <Toggle
            label="New listings"
            hint="First seen in the most recent scrape"
            value={draft.newOnly}
            onChange={(v) => patch({ newOnly: v })}
          />
          <Toggle
            label="Hide 55+ communities"
            value={draft.exclude55}
            onChange={(v) => patch({ exclude55: v })}
          />
        </Section>

        <Section title="Sort by">
          <Choice options={SORTS} value={draft.sort} onChange={(v) => patch({ sort: v })} />
        </Section>

        <Text style={styles.summary}>
          {summarize(draft)}
        </Text>

        <View style={styles.actions}>
          <Button label="Show results" onPress={apply} />
          <Button label="Save this search" onPress={handleSaveSearch} variant="ghost" />
          <Button label="Save as my default" onPress={() => void saveDefault()} variant="ghost" />
          <Button
            label="Reset"
            onPress={() => setDraft({ ...DEFAULT_PREFS, city: draft.city })}
            variant="ghost"
          />
        </View>
      </ScrollView>
    </View>
  );
}

function summarize(p: Prefs): string {
  const bits: string[] = [];
  bits.push(p.city === "all" ? "All cities" : p.city);
  if (p.minBeds) bits.push(`${p.minBeds}+ bd`);
  if (p.minBaths) bits.push(`${p.minBaths}+ ba`);
  if (p.maxPrice) bits.push(`under ${moneyShort(p.maxPrice)}`);
  if (p.minSqft) bits.push(`${p.minSqft}+ sqft`);
  if (p.builders.length) bits.push(p.builders.join(", "));
  if (p.priceDropOnly) bits.push("price drops");
  if (p.mirOnly) bits.push("move-in ready");
  if (p.newOnly) bits.push("new");
  return bits.join("  ·  ");
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.xl, paddingBottom: 48 },
  savedSearches: {
    gap: spacing.sm,
  },
  savedSearch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  searchName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: fontWeights.semiBold,
    flex: 1,
  },
  quickFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  hint: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  summary: {
    color: colors.textMut,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  actions: { gap: spacing.md },
});
