import { parseBaths } from "@/lib/scoring";

export default function AttributeBadges({
  beds,
  baths,
  sqft,
  price,
  is55Plus,
}: {
  beds: number | null;
  baths: string | null;
  sqft: number | null;
  price: number;
  is55Plus: number;
}) {
  const bathsNum = parseBaths(baths);
  const ppsf = sqft && price ? Math.round(price / sqft) : 0;

  const items: { icon: React.ReactNode; label: string }[] = [];

  if (beds && beds > 0) {
    items.push({
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v11m0-4h18m0 4V8a2 2 0 00-2-2H5a2 2 0 00-2 2m18 3V7" />
        </svg>
      ),
      label: `${beds}`,
    });
  }

  if (bathsNum > 0) {
    items.push({
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2v-5H3v5a2 2 0 002 2z" />
        </svg>
      ),
      label: `${bathsNum}`,
    });
  }

  if (sqft && sqft > 0) {
    items.push({
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
        </svg>
      ),
      label: `${sqft.toLocaleString()}`,
    });
  }

  if (ppsf > 0) {
    items.push({
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      label: `$${ppsf}/sf`,
    });
  }

  if (items.length === 0 && !is55Plus) return null;

  return (
    <div className="flex flex-wrap items-center gap-0">
      {items.map((item, i) => (
        <div
          key={i}
          className={`flex items-center gap-1 px-2 py-1 text-slate-400 text-xs ${
            i < items.length - 1 ? "border-r border-slate-800" : ""
          }`}
        >
          {item.icon}
          <span>{item.label}</span>
        </div>
      ))}
      {is55Plus === 1 && (
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
          55+
        </span>
      )}
    </div>
  );
}
