import { LineChart } from "react-native-chart-kit";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { colors, fontWeights, radius, spacing } from "@/lib/theme";
import { money, shortDate } from "@/lib/format";
import type { PricePoint } from "@/lib/types";

interface PriceChartProps {
  priceHistory: PricePoint[];
}

export function PriceChart({ priceHistory }: PriceChartProps) {
  if (!priceHistory || priceHistory.length === 0) {
    return null;
  }

  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - spacing.lg * 2;

  // Sort by date and take last 10 points for readability
  const sorted = [...priceHistory]
    .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())
    .slice(-10);

  const prices = sorted.map((p) => p.new_price);
  const labels = sorted.map((p) => {
    const date = new Date(p.changed_at);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const currentPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const totalChange = currentPrice - firstPrice;
  const changePercent = firstPrice > 0 ? ((totalChange / firstPrice) * 100).toFixed(1) : "0";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Price History</Text>
        {totalChange !== 0 && (
          <View style={styles.changeContainer}>
            <Text
              style={[
                styles.change,
                { color: totalChange > 0 ? colors.red : colors.green },
              ]}
            >
              {totalChange > 0 ? "+" : ""}
              {money(Math.abs(totalChange))} ({changePercent}%)
            </Text>
          </View>
        )}
      </View>

      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: prices,
            },
          ],
        }}
        width={chartWidth}
        height={220}
        chartConfig={{
          backgroundColor: colors.surface,
          backgroundGradientFrom: colors.surface,
          backgroundGradientTo: colors.surface,
          decimalPlaces: 0,
          color: (opacity = 1) => {
            const isDown = currentPrice < firstPrice;
            return isDown
              ? `rgba(16, 185, 129, ${opacity})` // green
              : `rgba(239, 68, 68, ${opacity})`; // red
          },
          labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
          style: {
            borderRadius: radius.md,
          },
          propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: colors.border,
          },
          propsForBackgroundLines: {
            strokeDasharray: "",
            stroke: colors.border,
            strokeWidth: 1,
          },
        }}
        bezier
        style={styles.chart}
        formatYLabel={(value) => `${Math.round(Number(value) / 1000)}K`}
      />

      {sorted.length > 0 && (
        <View style={styles.info}>
          <Text style={styles.infoText}>
            {sorted.length} price {sorted.length === 1 ? "change" : "changes"} tracked
          </Text>
          <Text style={styles.infoText}>
            Range: {money(minPrice)} - {money(maxPrice)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: fontWeights.bold,
  },
  changeContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  change: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
  },
  chart: {
    borderRadius: radius.md,
  },
  info: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  infoText: {
    color: colors.textFaint,
    fontSize: 11,
  },
});
