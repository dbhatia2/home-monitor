"use client";

import { useEffect, useState, useCallback } from "react";
import HomeCard from "@/components/HomeCard";
import StatsBar from "@/components/StatsBar";
import TabBar from "@/components/TabBar";
import BudgetBar from "@/components/BudgetBar";
import GroupManager from "@/components/GroupManager";
import ThemeToggle from "@/components/ThemeToggle";
import AIAssistant from "@/components/AIAssistant";
import type { Home, CityStats } from "@/lib/types";

type SortKey = "price_drop" | "sqft" | "ppsf" | "price";

export default function Dashboard() {
  const [homes, setHomes] = useState<Home[]>([]);
  const [stats, setStats] = useState<CityStats[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState("all");
  const [minBeds, setMinBeds] = useState("");
  const [addressSearch, setAddressSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("price_drop");
  const [loading, setLoading] = useState(true);

  // Pending filter state (not yet applied)
  const [pendingCity, setPendingCity] = useState("all");
  const [pendingMinBeds, setPendingMinBeds] = useState("");
  const [pendingAddressSearch, setPendingAddressSearch] = useState("");
  const [pendingSort, setPendingSort] = useState<SortKey>("price_drop");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCity !== "all") params.set("city", selectedCity);
    if (minBeds) params.set("minBeds", minBeds);
    if (addressSearch) params.set("address", addressSearch);
    params.set("sort", sort);
    params.set("limit", "50");

    try {
      const res = await fetch(`/api/homes?${params}`);
      const data = await res.json();
      setHomes(data.homes || []);
      setStats(data.stats || []);
      if (data.cities) setCities(data.cities);
    } catch (e) {
      console.error("Fetch failed:", e);
    }
    setLoading(false);
  }, [selectedCity, minBeds, addressSearch, sort]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyFilters = () => {
    setSelectedCity(pendingCity);
    setMinBeds(pendingMinBeds);
    setAddressSearch(pendingAddressSearch);
    setSort(pendingSort);
  };

  const hasUnappliedChanges =
    pendingCity !== selectedCity ||
    pendingMinBeds !== minBeds ||
    pendingAddressSearch !== addressSearch ||
    pendingSort !== sort;

  // Check if any filters are active
  const hasActiveFilters = selectedCity !== "all" || minBeds !== "" || addressSearch !== "";

  const topDrops = homes
    .filter((h) => h.price_drop === 1 && h.price_drop_amt > 0)
    .sort((a, b) => b.price_drop_amt - a.price_drop_amt)
    .slice(0, 10);

  const topSqft = homes
    .filter((h) => h.sqft && h.sqft > 0)
    .sort((a, b) => (b.sqft || 0) - (a.sqft || 0))
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#09090f]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between h-14 px-5 sm:px-10 bg-white/95 dark:bg-[#09090f]/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-800/50">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">Home Monitor</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 dark:text-slate-600 uppercase tracking-widest">
            Tracy &bull; Mountain House &bull; Dublin &bull; Roseville
          </span>
          <ThemeToggle />
        </div>
      </nav>

      {/* Tabs */}
      <TabBar />

      <main className="max-w-[1400px] mx-auto px-5 sm:px-10 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {/* City */}
          <select
            value={pendingCity}
            onChange={(e) => setPendingCity(e.target.value)}
            className="bg-white border border-gray-300 text-slate-700 dark:bg-[#0e0e18] dark:border-slate-800 dark:text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Address Search */}
          <input
            type="text"
            value={pendingAddressSearch}
            onChange={(e) => setPendingAddressSearch(e.target.value)}
            placeholder="Search by address..."
            className="bg-white border border-gray-300 text-slate-700 dark:bg-[#0e0e18] dark:border-slate-800 dark:text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:border-emerald-500 focus:outline-none min-w-[200px]"
          />

          {/* Min Beds */}
          <select
            value={pendingMinBeds}
            onChange={(e) => setPendingMinBeds(e.target.value)}
            className="bg-white border border-gray-300 text-slate-700 dark:bg-[#0e0e18] dark:border-slate-800 dark:text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Any Beds</option>
            <option value="2">2+ Beds</option>
            <option value="3">3+ Beds</option>
            <option value="4">4+ Beds</option>
            <option value="5">5+ Beds</option>
          </select>

          {/* Sort */}
          <select
            value={pendingSort}
            onChange={(e) => setPendingSort(e.target.value as SortKey)}
            className="bg-white border border-gray-300 text-slate-700 dark:bg-[#0e0e18] dark:border-slate-800 dark:text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:border-emerald-500 focus:outline-none"
          >
            <option value="price_drop">Sort: Biggest Drops</option>
            <option value="sqft">Sort: Largest Homes</option>
            <option value="ppsf">Sort: Best $/sqft</option>
            <option value="price">Sort: Lowest Price</option>
          </select>

          {/* Apply Button */}
          <button
            onClick={applyFilters}
            disabled={!hasUnappliedChanges}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              hasUnappliedChanges
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            Apply Filters
          </button>

          {loading && (
            <span className="text-emerald-400 text-xs self-center animate-pulse">Loading...</span>
          )}
        </div>

        {/* Budget & Groups */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <BudgetBar homes={homes} />
          </div>
          <div>
            <GroupManager />
          </div>
        </div>

        {/* Cross-City Comparison */}
        {stats.length > 1 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <span className="text-emerald-400">&#9632;</span> Market Comparison
            </h2>
            <StatsBar stats={stats} />
          </section>
        )}

        {/* Top Price Drops - Only show when no filters are active */}
        {!hasActiveFilters && topDrops.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <span className="text-red-400">&#9660;</span> Top Price Drops
              <span className="text-xs text-slate-600 font-normal ml-2">
                {topDrops.length} homes with price reductions
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topDrops.map((h, i) => (
                <HomeCard key={h.id} home={h} rank={i + 1} />
              ))}
            </div>
          </section>
        )}

        {/* Top by Sqft - Only show when no filters are active */}
        {!hasActiveFilters && topSqft.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <span className="text-blue-400">&#9632;</span> Largest Homes by Sqft
              <span className="text-xs text-slate-600 font-normal ml-2">
                Biggest floor plans available
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topSqft.map((h, i) => (
                <HomeCard key={h.id} home={h} rank={i + 1} />
              ))}
            </div>
          </section>
        )}

        {/* Filtered Results / All Homes Grid */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
            {hasActiveFilters ? 'Filtered Results' : 'All Listings'}
            <span className="text-xs text-slate-500 dark:text-slate-600 font-normal ml-2">
              {homes.length} homes
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {homes.map((h) => (
              <HomeCard key={h.id} home={h} />
            ))}
          </div>
          {homes.length === 0 && !loading && (
            <p className="text-slate-600 text-center py-12">No homes match your filters.</p>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-800/50 px-5 sm:px-10 py-6 text-center">
        <p className="text-[11px] text-slate-500 dark:text-slate-700">
          Home Monitor &mdash; Tracy &bull; Mountain House &bull; Dublin &bull; Roseville, CA
          <br />Automated daily scraping from builder websites &bull; Data updated every 24h
        </p>
      </footer>

      {/* AI Assistant */}
      <AIAssistant homes={homes} />

      {/* Sticky Apply Button at Bottom */}
      {hasUnappliedChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-700 px-5 py-4 z-40">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You have unapplied filter changes
            </p>
            <button
              onClick={applyFilters}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg text-sm font-semibold transition-all shadow-lg"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
