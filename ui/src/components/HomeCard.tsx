"use client";

import { useState } from "react";
import { useTabContext } from "@/contexts/TabContext";
import type { Home } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  MOVE_IN_READY: "#10B981",
  QUICK_MOVE_IN: "#10B981",
  AVAILABLE: "#3B82F6",
  UNDER_CONSTRUCTION: "#F59E0B",
  COMING_SOON: "#64748B",
  MODEL_HOME: "#8B5CF6",
};

export default function HomeCard({ home, rank }: { home: Home; rank?: number }) {
  const { activeTab, addHomeToGroup, removeHomeFromGroup, isHomeInTab } = useTabContext();
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  const ppsf = home.sqft && home.price ? Math.round(home.price / home.sqft) : 0;
  const statusColor = STATUS_COLORS[home.status] || "#64748B";
  const statusLabel = home.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const inTab = isHomeInTab(home.id);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleGroupToggle = (groupId: string, isInGroup: boolean) => {
    if (isInGroup) {
      removeHomeFromGroup(home.id, groupId);
    } else {
      addHomeToGroup(home.id, groupId);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-5 hover:border-gray-300 dark:hover:border-slate-700 transition-all bg-white dark:bg-[#0e0e18] relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
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

      {/* Community + City + Link */}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-slate-500 dark:text-slate-500 text-xs">
          {home.community} &mdash; {home.city}
        </p>
        {home.home_url && (
          <a
            href={home.home_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-500 hover:text-emerald-400 transition-colors"
            title="View on builder website"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* Price + Specs */}
      <div className="flex items-end justify-between">
        <div>
          {home.price_drop === 1 && home.price_drop_amt > 0 ? (
            <>
              <p className="text-red-400 text-xl font-bold">${home.price.toLocaleString()}</p>
              <p className="text-slate-500 dark:text-slate-600 text-sm line-through">
                ${(home.prev_price || home.was_price || 0).toLocaleString()}
              </p>
              <p className="text-red-400 text-xs font-semibold">
                -${home.price_drop_amt.toLocaleString()}
              </p>
            </>
          ) : (
            <p className="text-slate-800 dark:text-slate-200 text-xl font-bold">${home.price.toLocaleString()}</p>
          )}
          {ppsf > 0 && <p className="text-slate-500 dark:text-slate-600 text-xs mt-1">${ppsf}/sqft</p>}
        </div>
        <div className="text-right">
          <p className="text-slate-700 dark:text-slate-300 text-sm">
            {home.beds && `${home.beds} bed`}
            {home.baths && ` · ${home.baths} bath`}
          </p>
          {home.sqft && home.sqft > 0 && (
            <p className="text-slate-500 dark:text-slate-500 text-xs">{home.sqft.toLocaleString()} sqft</p>
          )}
        </div>
      </div>

      {/* Address */}
      <p className="text-slate-500 dark:text-slate-600 text-xs mt-3 truncate">{home.address}</p>

      {/* Additional Details */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-800 space-y-1">
        {home.plan_name && (
          <p className="text-slate-600 dark:text-slate-700 text-[10px]">
            <span className="text-slate-500 dark:text-slate-600">Plan:</span> {home.plan_name}
          </p>
        )}
        {home.homesite && (
          <p className="text-slate-600 dark:text-slate-700 text-[10px]">
            <span className="text-slate-500 dark:text-slate-600">Lot:</span> {home.homesite}
          </p>
        )}
        {home.last_seen_at && (
          <p className="text-slate-600 dark:text-slate-700 text-[10px]">
            <span className="text-slate-500 dark:text-slate-600">Last updated:</span> {formatDate(home.last_seen_at)}
          </p>
        )}
        {home.spotlight_features && Object.keys(home.spotlight_features).length > 0 && (
          <div className="flex items-start gap-1">
            <span className="text-emerald-400">★</span>
            <p className="text-slate-600 dark:text-slate-700 text-[10px] flex-1">
              {Object.values(home.spotlight_features).slice(0, 3).join(" • ")}
            </p>
          </div>
        )}
      </div>

      {/* Add to Group Button */}
      <div className="mt-3 relative">
        <button
          onClick={() => setShowGroupMenu(!showGroupMenu)}
          className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            inTab
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/50'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300 border border-slate-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {inTab ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            )}
          </svg>
          {inTab ? 'In Tab' : 'Add to Group'}
        </button>

        {/* Group Selection Menu */}
        {showGroupMenu && activeTab && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-10 py-1">
            <div className="px-3 py-1.5 text-xs text-slate-500 border-b border-slate-800">
              Select groups for this home:
            </div>
            {activeTab.groups.map((group) => {
              const isInGroup = group.homeIds.includes(home.id);
              return (
                <button
                  key={group.id}
                  onClick={() => handleGroupToggle(group.id, isInGroup)}
                  className="w-full px-3 py-2 hover:bg-slate-800 transition-colors flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="text-slate-300">{group.name}</span>
                  </div>
                  {isInGroup && (
                    <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
