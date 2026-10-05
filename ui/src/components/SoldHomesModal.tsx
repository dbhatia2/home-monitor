"use client";

import { useEffect, useState } from "react";
import { SoldHomesResponse } from "@/lib/types";
import { getPrimaryPropertyUrl } from "@/lib/property-links";
import { formatRelativeDate } from "@/lib/date-utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  communityId: number;
  communityName: string;
  currentHomeAddress: string;
}

export default function SoldHomesModal({
  isOpen,
  onClose,
  planName,
  communityId,
  communityName,
  currentHomeAddress,
}: Props) {
  const [data, setData] = useState<SoldHomesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSoldHomes = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          plan_name: planName,
          community_id: communityId.toString()
        });
        const response = await fetch(`/api/homes/sold-by-plan?${params}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("No sold homes found for this plan yet");
          } else {
            setError("Failed to load sold homes");
          }
          setData(null);
          return;
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching sold homes:", err);
        setError("Failed to load sold homes");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSoldHomes();
  }, [isOpen, planName]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter out current home from results
  const soldHomes = data?.sold_homes.filter(
    (home) => home.address !== currentHomeAddress
  ) || [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[500px] lg:w-[600px] bg-slate-900 shadow-2xl z-50 flex flex-col border-l border-slate-800 animate-slide-in">
        {/* Header */}
        <div className="border-b border-slate-800">
          <div className="flex items-center justify-between p-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-semibold text-slate-200">
                  Similar Sold Homes
                </h2>
                <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs rounded font-semibold flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  PRO
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Plan: {planName} • {communityName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors p-2 hover:bg-slate-800 rounded-lg"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Premium Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-t border-amber-500/20 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <p className="text-sm text-amber-300 font-medium">
                  Verified actual sold prices from county records
                </p>
              </div>
              <button className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold rounded transition-all">
                Learn More
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-400">Loading sold homes...</div>
            </div>
          )}

          {error && !loading && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
              <p className="text-slate-300 mb-4">
                No sold homes found for "{planName}" in this community yet
              </p>
              <a
                href={`https://www.zillow.com/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Search on Zillow
              </a>
            </div>
          )}

          {!loading && !error && soldHomes.length === 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
              <p className="text-slate-300 mb-4">
                No other sold homes found for "{planName}" in this community
              </p>
            </div>
          )}

          {!loading && !error && soldHomes.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 mb-4">
                Found {soldHomes.length} sold home{soldHomes.length !== 1 ? "s" : ""}
              </p>

              {soldHomes.map((home) => {
                const propertyUrl = getPrimaryPropertyUrl(
                  home.address,
                  home.city,
                  home.state
                );
                const relativeDate = formatRelativeDate(home.last_seen_at);

                return (
                  <div
                    key={home.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
                  >
                    {/* Address */}
                    <a
                      href={propertyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-emerald-400 hover:text-emerald-300 transition-colors block mb-2"
                    >
                      {home.address}
                    </a>

                    {/* Price - Premium Feature */}
                    <div className="mb-2">
                      {home.sold_price_verified && home.sold_price ? (
                        <>
                          {/* Premium Badge */}
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-xs text-emerald-400 uppercase tracking-wide">
                              Actual Sold Price
                            </p>
                            <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs rounded font-semibold flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              PRO
                            </span>
                          </div>

                          {/* Blurred/Locked Content Overlay */}
                          <div className="relative">
                            {/* The actual content (blurred) */}
                            <div className="filter blur-sm select-none pointer-events-none">
                              <p className="text-2xl font-semibold text-emerald-400">
                                ${home.sold_price.toLocaleString()}
                              </p>
                              {home.sold_date && (
                                <p className="text-xs text-slate-400 mt-1">
                                  Sold on {new Date(home.sold_date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                              )}
                              {home.price !== home.sold_price && (
                                <div className="mt-2 p-2 bg-slate-800/50 rounded">
                                  <p className="text-sm text-slate-300">
                                    vs Builder Price: ${home.price.toLocaleString()}
                                  </p>
                                  {home.sold_price > home.price && (
                                    <p className="text-sm text-amber-400 font-medium">
                                      +${(home.sold_price - home.price).toLocaleString()} ({(((home.sold_price - home.price) / home.price) * 100).toFixed(1)}% higher)
                                    </p>
                                  )}
                                  {home.sold_price < home.price && (
                                    <p className="text-sm text-emerald-400 font-medium">
                                      -${(home.price - home.sold_price).toLocaleString()} ({(((home.price - home.sold_price) / home.price) * 100).toFixed(1)}% lower)
                                    </p>
                                  )}
                                </div>
                              )}
                              {home.apn && (
                                <p className="text-xs text-slate-400 mt-2">
                                  <span className="text-slate-500">APN:</span> {home.apn}
                                </p>
                              )}
                              {home.lot_size_acres && (
                                <p className="text-xs text-slate-400">
                                  <span className="text-slate-500">Lot Size:</span> {home.lot_size_acres} acres
                                </p>
                              )}
                              {home.sale_transaction_type && (
                                <p className="text-xs text-slate-400">
                                  <span className="text-slate-500">Type:</span> {home.sale_transaction_type}
                                </p>
                              )}
                            </div>

                            {/* Unlock Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent rounded-lg">
                              <div className="text-center px-4 py-3">
                                <svg className="w-8 h-8 mx-auto mb-2 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm font-semibold text-white mb-1">Premium Feature</p>
                                <p className="text-xs text-slate-300 mb-3">
                                  Unlock verified sold prices & property data
                                </p>
                                <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl">
                                  Upgrade to Pro
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Show builder price for context */}
                          <div className="mt-4 pt-4 border-t border-slate-700/50">
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                              Last Builder Price
                            </p>
                            <p className="text-xl font-semibold text-slate-300">
                              ${home.price.toLocaleString()}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Estimated Builder Price */}
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                            Last Builder Price
                          </p>
                          <p className="text-2xl font-semibold text-slate-200">
                            ${home.price.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 flex items-start gap-1">
                            <svg
                              className="w-3 h-3 mt-0.5 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span>
                              Estimated price from builder&apos;s website. Actual sold price may differ.
                            </span>
                          </p>
                        </>
                      )}
                    </div>

                    {/* Home details */}
                    <div className="flex items-center gap-3 text-sm text-slate-400 mb-3">
                      {home.beds && <span>{home.beds} bd</span>}
                      {home.baths && <span>• {home.baths} ba</span>}
                      {home.sqft && <span>• {home.sqft.toLocaleString()} sqft</span>}
                    </div>

                    {/* Last seen date */}
                    <p className="text-xs text-slate-500 mb-3">
                      Last seen on builder site: {relativeDate || "Unknown"}
                    </p>

                    {/* Zillow link button */}
                    <a
                      href={propertyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      View on Zillow
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
