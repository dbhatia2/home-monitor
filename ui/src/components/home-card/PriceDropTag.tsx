export default function PriceDropTag({
  price,
  priceDrop,
  priceDropAmt,
  prevPrice,
  wasPrice,
}: {
  price: number;
  priceDrop: number;
  priceDropAmt: number;
  prevPrice: number | null;
  wasPrice: number | null;
}) {
  if (!priceDrop || priceDropAmt <= 0) return null;

  const base = prevPrice || wasPrice || price + priceDropAmt;
  const pct = base > 0 ? (priceDropAmt / base) * 100 : 0;

  return (
    <div className="mt-1">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        -${priceDropAmt.toLocaleString()}
        {pct > 0 && (
          <span className="text-red-400/70">({pct.toFixed(1)}%)</span>
        )}
      </span>
    </div>
  );
}
