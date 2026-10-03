import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";

export function scoreTone(score: number): string {
  if (score >= 90) return colors.scoreExcellent;
  if (score >= 70) return colors.scoreGood;
  return colors.scoreAverage;
}

export function scoreBackground(score: number): string {
  if (score >= 90) return colors.scoreExcellent + "20"; // 20 = 12.5% opacity
  if (score >= 70) return colors.scoreGood + "20";
  return colors.scoreAverage + "20";
}

interface ScoreBadgeProps {
  score: number;
  size?: "small" | "medium" | "large";
}

export function ScoreBadge({ score, size = "medium" }: ScoreBadgeProps) {
  const roundedScore = Math.round(score);
  const tone = scoreTone(roundedScore);
  const bg = scoreBackground(roundedScore);

  const sizeStyles = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  const textStyles = {
    small: styles.textSmall,
    medium: styles.textMedium,
    large: styles.textLarge,
  };

  return (
    <View style={[styles.badge, sizeStyles[size], { backgroundColor: bg, borderColor: tone }]}>
      <Text style={[styles.score, textStyles[size], { color: tone }]}>{roundedScore}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  small: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    minWidth: 40,
  },
  medium: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 50,
  },
  large: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minWidth: 60,
  },
  score: {
    fontWeight: "900",
  },
  textSmall: {
    fontSize: 14,
  },
  textMedium: {
    fontSize: 20,
  },
  textLarge: {
    fontSize: 28,
  },
});
