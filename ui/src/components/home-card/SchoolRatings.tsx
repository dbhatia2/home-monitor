import type { School } from "@/lib/types";

function ratingColor(rating: number | null): string {
  if (rating === null) return "bg-slate-600 text-slate-300";
  if (rating >= 7) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
  if (rating >= 4) return "bg-amber-500/20 text-amber-400 border-amber-500/40";
  return "bg-red-500/20 text-red-400 border-red-500/40";
}

function pickSchools(schools: School[]): School[] {
  const byType: Record<string, School> = {};
  const priority = ["Elementary", "Middle", "High"];

  for (const type of priority) {
    const match = schools.find(
      (s) => s.type?.toLowerCase().includes(type.toLowerCase()) && !byType[type],
    );
    if (match) byType[type] = match;
  }

  const picked = Object.values(byType);
  // Fill remaining slots up to 3
  for (const s of schools) {
    if (picked.length >= 3) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return picked.slice(0, 3);
}

export default function SchoolRatings({
  schools,
  loading,
}: {
  schools?: School[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="mt-2 space-y-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 bg-slate-800 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!schools || schools.length === 0) return null;

  const picked = pickSchools(schools);

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1 mb-1.5">
        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
        <span className="text-[10px] text-slate-500 font-medium">Schools</span>
      </div>
      <div className="space-y-1">
        {picked.map((school, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0 ${ratingColor(school.rating_gs)}`}
            >
              {school.rating_gs !== null ? school.rating_gs : "NR"}
            </span>
            <span className="text-[10px] text-slate-400 truncate flex-1">
              {school.name}
            </span>
            {school.distance && (
              <span className="text-[9px] text-slate-600 shrink-0">{school.distance}</span>
            )}
            {school.type && (
              <span className="text-[9px] text-slate-600 bg-slate-800/50 px-1 rounded shrink-0">
                {school.type.replace(" School", "")}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
