export function money(n: number | null | undefined): string {
  if (!n) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** 742206 -> "$742K", 1250000 -> "$1.25M" */
export function moneyShort(n: number | null | undefined): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  return `$${Math.round(n / 1000)}K`;
}

export function ppsf(price: number, sqft: number | null | undefined): number | null {
  if (!sqft || sqft <= 0 || !price) return null;
  return Math.round(price / sqft);
}

export function sqftLabel(n: number | null | undefined): string {
  if (!n) return "—";
  return `${Math.round(n).toLocaleString("en-US")} sqft`;
}

export function specs(
  beds: number | null,
  baths: string | null,
  sqft: number | null,
): string {
  const parts: string[] = [];
  if (beds) parts.push(`${beds} bd`);
  if (baths) parts.push(`${baths} ba`);
  if (sqft) parts.push(`${Math.round(sqft).toLocaleString("en-US")} sf`);
  return parts.join("  ·  ") || "—";
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
