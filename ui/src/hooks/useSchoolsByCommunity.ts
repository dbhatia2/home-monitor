import { useState, useEffect, useRef, useMemo } from "react";
import type { School, SchoolsByCommunity } from "@/lib/types";

export function useSchoolsByCommunity(communityIds: number[]) {
  const [data, setData] = useState<SchoolsByCommunity>({});
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const newIds = communityIds.filter((id) => !fetchedRef.current.has(id));
    if (newIds.length === 0) return;

    // Mark as fetched immediately to avoid duplicate requests
    for (const id of newIds) fetchedRef.current.add(id);

    setLoading(true);

    fetch(`/api/schools/by-community?community_ids=${newIds.join(",")}`)
      .then((res) => res.json())
      .then((result: Record<string, School[]>) => {
        setData((prev) => {
          const next = { ...prev };
          for (const [key, schools] of Object.entries(result)) {
            next[Number(key)] = schools;
          }
          return next;
        });
      })
      .catch((err) => {
        console.error("Failed to fetch schools:", err);
        // Allow retry on failure
        for (const id of newIds) fetchedRef.current.delete(id);
      })
      .finally(() => setLoading(false));
  }, [communityIds]);

  const stableData = useMemo(() => data, [data]);

  return { schools: stableData, loading };
}
