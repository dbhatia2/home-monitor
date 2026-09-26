"use client";

import { useTabContext } from "@/contexts/TabContext";
import type { Home } from "@/lib/types";

export default function BudgetBar({ homes }: { homes: Home[] }) {
  const { activeTab } = useTabContext();

  if (!activeTab) return null;

  const allHomeIds = new Set(activeTab.groups.flatMap(g => g.homeIds));
  const selectedHomes = homes.filter(h => allHomeIds.has(h.id));
  const total = selectedHomes.reduce((sum, h) => sum + h.price, 0);
  const percentage = activeTab.budget > 0 ? Math.min((total / activeTab.budget) * 100, 100) : 0;
  const isOverBudget = total > activeTab.budget;

  if (selectedHomes.length === 0) return null;

  const circumference = 2 * Math.PI * 58; // radius = 58
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white dark:bg-[#0e0e18] border border-gray-200 dark:border-slate-800 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-6">
        {/* Circular Progress */}
        <div className="relative flex-shrink-0">
          <svg className="w-36 h-36 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="72"
              cy="72"
              r="58"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-slate-900"
            />

            {/* Progress segments for each group */}
            {(() => {
              let cumulativePercentage = 0;
              return activeTab.groups.map((group) => {
                const groupHomes = homes.filter(h => group.homeIds.includes(h.id));
                const groupTotal = groupHomes.reduce((sum, h) => sum + h.price, 0);
                const groupPercentage = activeTab.budget > 0 ? (groupTotal / activeTab.budget) * 100 : 0;

                if (groupTotal === 0) return null;

                const startOffset = circumference - (cumulativePercentage / 100) * circumference;
                const segmentLength = (groupPercentage / 100) * circumference;

                cumulativePercentage += groupPercentage;

                return (
                  <circle
                    key={group.id}
                    cx="72"
                    cy="72"
                    r="58"
                    stroke={group.color}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${segmentLength} ${circumference}`}
                    strokeDashoffset={-startOffset}
                    className="transition-all duration-300"
                    style={{ opacity: 0.9 }}
                  />
                );
              });
            })()}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-2xl font-bold ${isOverBudget ? 'text-red-400' : 'text-emerald-400'}`}>
              ${(total / 1000).toFixed(0)}K
            </div>
            <div className="text-xs text-slate-600">
              of ${(activeTab.budget / 1000).toFixed(0)}K
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-600 mt-1">
              {percentage.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Legend and details */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Budget Tracker</h3>
          <p className="text-xs text-slate-500 dark:text-slate-600 mb-3">
            {selectedHomes.length} {selectedHomes.length === 1 ? 'home' : 'homes'} selected
          </p>

          <div className="flex flex-wrap gap-3">
            {activeTab.groups.map((group) => {
              const groupHomes = homes.filter(h => group.homeIds.includes(h.id));
              const groupTotal = groupHomes.reduce((sum, h) => sum + h.price, 0);

              if (groupTotal === 0) return null;

              return (
                <div key={group.id} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-slate-400">
                    {group.name}: <span className="text-slate-300 font-semibold">${(groupTotal / 1000).toFixed(0)}K</span>
                    {groupHomes.length > 1 && (
                      <span className="text-slate-600 ml-1">({groupHomes.length})</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {isOverBudget && (
            <div className="mt-3 text-xs text-red-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Over budget by ${((total - activeTab.budget) / 1000).toFixed(0)}K
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
