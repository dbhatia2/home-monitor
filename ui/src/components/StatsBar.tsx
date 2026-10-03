"use client";

interface CityStats {
  city: string;
  total: number;
  mir: number;
  drops: number;
  avg_price: number;
  avg_ppsf: number;
}

export default function StatsBar({ stats }: { stats: CityStats[] }) {
  if (!stats || stats.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-gray-50 dark:bg-[#0e0e18]">
            <th className="px-4 py-3 text-left text-slate-600 dark:text-slate-500 font-semibold"></th>
            {stats.map((s) => (
              <th key={s.city} className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">
                {s.city}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-slate-400">
          <tr className="border-t border-slate-800">
            <td className="px-4 py-2 font-semibold text-slate-500">Active Homes</td>
            {stats.map((s) => (
              <td key={s.city} className="px-4 py-2 text-center text-slate-200 font-bold">
                {s.total}
              </td>
            ))}
          </tr>
          <tr className="border-t border-slate-800/50">
            <td className="px-4 py-2 font-semibold text-slate-500">Avg Price</td>
            {stats.map((s) => (
              <td key={s.city} className="px-4 py-2 text-center">
                {s.avg_price ? `$${Math.round(s.avg_price / 1000)}K` : "—"}
              </td>
            ))}
          </tr>
          <tr className="border-t border-slate-800/50">
            <td className="px-4 py-2 font-semibold text-slate-500">Avg $/sqft</td>
            {stats.map((s) => (
              <td key={s.city} className="px-4 py-2 text-center">
                {s.avg_ppsf ? `$${s.avg_ppsf}` : "—"}
              </td>
            ))}
          </tr>
          <tr className="border-t border-slate-800/50">
            <td className="px-4 py-2 font-semibold text-slate-500">Move-In Ready</td>
            {stats.map((s) => (
              <td key={s.city} className="px-4 py-2 text-center text-emerald-400 font-semibold">
                {s.mir || 0}
              </td>
            ))}
          </tr>
          <tr className="border-t border-slate-800/50">
            <td className="px-4 py-2 font-semibold text-slate-500">Price Drops</td>
            {stats.map((s) => (
              <td key={s.city} className="px-4 py-2 text-center text-red-400 font-semibold">
                {s.drops || 0}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export type { CityStats };
