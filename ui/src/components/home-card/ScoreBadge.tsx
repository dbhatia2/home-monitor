export default function ScoreBadge({ score }: { score?: number }) {
  if (score === undefined) return null;

  const tier =
    score >= 70
      ? { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-400" }
      : score >= 40
        ? { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-400" }
        : { bg: "bg-red-500/15", border: "border-red-500/40", text: "text-red-400" };

  return (
    <div
      className={`w-10 h-10 rounded-full flex flex-col items-center justify-center border ${tier.bg} ${tier.border} shrink-0`}
    >
      <span className={`text-sm font-bold leading-none ${tier.text}`}>
        {Math.round(score)}
      </span>
      <span className={`text-[9px] leading-none mt-0.5 ${tier.text} opacity-70`}>
        Score
      </span>
    </div>
  );
}
