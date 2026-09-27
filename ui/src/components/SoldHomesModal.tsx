"use client";

import { useEffect, useState } from "react";
import { SoldHomesResponse } from "@/lib/types";
import { generateRedfinUrl } from "@/lib/redfin";
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
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-semibold text-slate-200">
              Similar Sold Homes
            </h2>
            <p className="text-sm text-slate-400 mt-1">
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
                href={`https://www.redfin.com/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
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
                Search on Redfin
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
                const redfinUrl = generateRedfinUrl(
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
                      href={redfinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-medium text-emerald-400 hover:text-emerald-300 transition-colors block mb-2"
                    >
                      {home.address}
                    </a>

                    {/* Price */}
                    <p className="text-2xl font-semibold text-slate-200 mb-2">
                      ${home.price.toLocaleString()}
                    </p>

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

                    {/* Redfin link button */}
                    <a
                      href={redfinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
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
                      View on Redfin
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
