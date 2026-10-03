import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, MultiChoice, Section, Toggle } from "@/components/Controls";
import { apiBaseUrl, fetchFacets } from "@/lib/api";
import { moneyShort } from "@/lib/format";
import { useStore } from "@/lib/prefs";
import { colors, fontWeights, radius, spacing } from "@/lib/theme";
import type { Prefs } from "@/lib/types";

export default function ProfileScreen() {
  const { prefs, savePrefsAsDefault, savedIds, savedSearches } = useStore();

  const [draft, setDraft] = useState<Prefs>(prefs);
  const [builders, setBuilders] = useState<string[]>([]);
  const [communities, setCommunities] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  // Keep in step with changes made from the Filters sheet.
  useEffect(() => setDraft(prefs), [prefs]);

  useEffect(() => {
    const controller = new AbortController();
    fetchFacets(controller.signal)
      .then((f) => {
        setBuilders(f.builders.map((b) => b.name));
        setCommunities([...new Set(f.communities.map((c) => c.name))].sort());
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const patch = (p: Partial<Prefs>) => {
    setSaved(false);
    setDraft((d) => ({ ...d, ...p }));
  };

  const save = async () => {
    await savePrefsAsDefault(draft);
    setSaved(true);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your search</Text>
        <Text style={styles.cardBody}>
          {draft.city === "all" ? "All cities" : draft.city}
          {draft.minBeds ? `  ·  ${draft.minBeds}+ bd` : ""}
          {draft.minBaths ? `  ·  ${draft.minBaths}+ ba` : ""}
          {draft.maxPrice ? `  ·  under ${moneyShort(draft.maxPrice)}` : ""}
          {draft.minSqft ? `  ·  ${draft.minSqft}+ sqft` : ""}
        </Text>
        <Text style={styles.cardMeta}>
          {savedIds.length} saved homes  ·  {savedSearches.length} saved searches
        </Text>
      </View>

      <Section title="Preferred builders">
        <MultiChoice
          options={builders}
          values={draft.preferredBuilders}
          onChange={(v) => patch({ preferredBuilders: v })}
        />
        <Text style={styles.hint}>
          Adds 3 points to the match score. This nudges ranking rather than filtering
          anything out.
        </Text>
      </Section>

      <Section title="Preferred communities">
        <MultiChoice
          options={communities}
          values={draft.preferredCommunities}
          onChange={(v) => patch({ preferredCommunities: v })}
        />
        <Text style={styles.hint}>Adds 5 points to the match score.</Text>
      </Section>

      <Section title="Defaults">
        <Toggle
          label="Hide 55+ communities"
          value={draft.exclude55}
          onChange={(v) => patch({ exclude55: v })}
        />
      </Section>

      <View style={styles.actions}>
        <Button label={saved ? "Saved" : "Save preferences"} onPress={() => void save()} />
      </View>

      <Text style={styles.footer}>
        Scoring mirrors the daily digest email: best $/sqft 40, price drop 30, availability
        20, size 5, hot home 5.
        {"\n\n"}
        API: {apiBaseUrl}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.xl, paddingBottom: 48 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: 6,
  },
  cardTitle: { color: colors.textFaint, fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },
  cardBody: { color: colors.text, fontSize: 15, fontWeight: "700", lineHeight: 21 },
  cardMeta: { color: colors.textFaint, fontSize: 12 },
  hint: { color: colors.textFaint, fontSize: 12, lineHeight: 17, marginTop: 2 },
  actions: { gap: spacing.md, marginBottom: spacing.xl },
  footer: { color: colors.textFaint, fontSize: 11, lineHeight: 16 },
});
