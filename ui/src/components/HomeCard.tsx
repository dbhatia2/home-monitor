"use client";

interface Home {
  id: number;
  address: string;
  home_url: string;
  beds: number;
  baths: string;
  sqft: number;
  plan_name: string;
  price: number;
  was_price: number | null;
  price_per_sqft: number;
  status: string;
  is_hotw: number;
  price_drop: number;
  price_drop_amt: number;
  prev_price: number | null;
  new_listing: number;
  builder: string;
  builder_color: string;
  community: string;
  is_55_plus: number;
  city: string;
}

const STATUS_COLORS: Record<string, string> = {
  MOVE_IN_READY: "#10B981",
  QUICK_MOVE_IN: "#10B981",
  AVAILABLE: "#3B82F6",
  UNDER_CONSTRUCTION: "#F59E0B",
  COMING_SOON: "#64748B",
  MODEL_HOME: "#8B5CF6",
};

export default function HomeCard({ home, rank }: { home: Home; rank?: number }) {
  const ppsf = home.sqft && home.price ? Math.round(home.price / home.sqft) : 0;
  const statusColor = STATUS_COLORS[home.status] || "#64748B";
  const statusLabel = home.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all bg-[#0e0e18]">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {rank && (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
              #{rank}
            </span>
          )}
          <span
            className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white"
            style={{ backgroundColor: home.builder_color || "#64748B" }}
          >
            {home.builder}
          </span>
          {home.new_listing === 1 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">
              NEW
            </span>
          )}
          {home.is_hotw === 1 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
              HOTW
            </span>
          )}
        </div>
        <span
          className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold"
          style={{ backgroundColor: `${statusColor}22`, color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Community + City */}
      <p className="text-slate-500 text-xs mb-3">
        {home.community} &mdash; {home.city}
      </p>

      {/* Price + Specs */}
      <div className="flex items-end justify-between">
        <div>
          {home.price_drop === 1 && home.price_drop_amt > 0 ? (
            <>
              <p className="text-red-400 text-xl font-bold">${home.price.toLocaleString()}</p>
              <p className="text-slate-600 text-sm line-through">
                ${(home.prev_price || home.was_price || 0).toLocaleString()}
              </p>
              <p className="text-red-400 text-xs font-semibold">
                -${home.price_drop_amt.toLocaleString()}
              </p>
            </>
          ) : (
            <p className="text-slate-200 text-xl font-bold">${home.price.toLocaleString()}</p>
          )}
          {ppsf > 0 && <p className="text-slate-600 text-xs mt-1">${ppsf}/sqft</p>}
        </div>
        <div className="text-right">
          <p className="text-slate-300 text-sm">
            {home.beds && `${home.beds} bed`}
            {home.baths && ` · ${home.baths} bath`}
          </p>
          {home.sqft > 0 && (
            <p className="text-slate-500 text-xs">{home.sqft.toLocaleString()} sqft</p>
          )}
        </div>
      </div>

      {/* Address */}
      <p className="text-slate-600 text-xs mt-3 truncate">{home.address}</p>

      {/* Plan */}
      {home.plan_name && (
        <p className="text-slate-700 text-[10px] mt-1">Plan: {home.plan_name}</p>
      )}
    </div>
  );
}

export type { Home };
