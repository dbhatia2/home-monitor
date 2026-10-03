import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.green} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.textFaint} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.muted}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Empty({
  title,
  hint,
  icon = "home-outline",
}: {
  title: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={40} color={colors.textFaint} />
      <Text style={styles.errorTitle}>{title}</Text>
      {hint ? <Text style={styles.muted}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  errorTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  muted: { color: colors.textFaint, fontSize: 13, textAlign: "center", lineHeight: 19 },
  retry: {
    marginTop: spacing.sm,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.green,
  },
  retryText: { color: "#04150F", fontWeight: "700" },
});
