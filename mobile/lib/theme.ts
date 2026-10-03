/**
 * Design tokens. Colors are kept in sync with emails/styles.py so the app and
 * the daily digest emails read as the same product.
 */

export const colors = {
  bg: "#09090F",
  surface: "#0E0E18",
  surfaceHi: "#15151F",
  border: "#1E293B",
  borderHi: "#334155",

  text: "#F1F5F9",
  textMut: "#94A3B8",
  textFaint: "#64748B",

  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
  blue: "#3B82F6",
  purple: "#8B5CF6",

  // Value scores
  scoreExcellent: "#00C853", // 90+
  scoreGood: "#FFC107", // 70-89
  scoreAverage: "#9E9E9E", // <70

  // Deal indicators
  priceDrop: "#FF5252",
  newListing: "#2196F3",
  moveInReady: "#00C853",
} as const;

/** Mirrors BUILDER_COLORS in emails/styles.py. */
export const builderColors: Record<string, string> = {
  Lennar: "#1D4ED8",
  "KB Home": "#DC2626",
  "Toll Brothers": "#6D28D9",
  "Taylor Morrison": "#059669",
  "JMC Homes": "#7C2D12",
  "Brookfield Residential": "#374151",
  "Century Communities": "#B45309",
};

export const statusColors: Record<string, string> = {
  MOVE_IN_READY: colors.green,
  QUICK_MOVE_IN: colors.green,
  AVAILABLE: colors.blue,
  UNDER_CONSTRUCTION: colors.amber,
  COMING_SOON: colors.textFaint,
  MODEL_HOME: colors.purple,
};

export function builderColor(name: string, fallback?: string | null): string {
  return builderColors[name] ?? fallback ?? colors.textFaint;
}

export function statusColor(status: string): string {
  return statusColors[status] ?? colors.textFaint;
}

/** "MOVE_IN_READY" -> "Move In Ready" */
export function statusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  full: 999,
} as const;

export const fontSizes = {
  hero: 48,
  metric: 32,
  xlarge: 24,
  large: 20,
  medium: 16,
  regular: 14,
  small: 12,
  xsmall: 10,
} as const;

export const fontWeights = {
  black: "900" as const,
  extraBold: "800" as const,
  bold: "700" as const,
  semiBold: "600" as const,
  medium: "500" as const,
  regular: "400" as const,
} as const;
