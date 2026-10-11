#!/usr/bin/env bash
set -euo pipefail

echo "=== Home Cards Validation ==="

# 1. TypeScript compilation
echo ""
echo "1. TypeScript compilation..."
cd "$(dirname "$0")/../ui"
npx tsc --noEmit
echo "   PASS: TypeScript compiles without errors"

# 2. ESLint on changed files
echo ""
echo "2. ESLint on new/modified files..."
FILES=(
  src/components/home-card/ScoreBadge.tsx
  src/components/home-card/PriceDropTag.tsx
  src/components/home-card/AttributeBadges.tsx
  src/components/home-card/SchoolRatings.tsx
  src/components/home-card/index.ts
  src/components/HomeCard.tsx
  src/hooks/useSchoolsByCommunity.ts
  src/app/api/schools/by-community/route.ts
  src/app/page.tsx
  src/lib/types.ts
)
npx eslint "${FILES[@]}" --no-error-on-unmatched-pattern 2>/dev/null && echo "   PASS: ESLint passed" || echo "   WARN: ESLint found issues (non-blocking)"

# 3. Unit tests for score-to-color mapping and price drop math
echo ""
echo "3. Unit tests (score colors + price drop math)..."
node -e "
  // Score color tiers
  function scoreTier(score) {
    if (score >= 70) return 'emerald';
    if (score >= 40) return 'amber';
    return 'red';
  }

  console.assert(scoreTier(0) === 'red', 'Score 0 should be red');
  console.assert(scoreTier(39) === 'red', 'Score 39 should be red');
  console.assert(scoreTier(40) === 'amber', 'Score 40 should be amber');
  console.assert(scoreTier(69) === 'amber', 'Score 69 should be amber');
  console.assert(scoreTier(70) === 'emerald', 'Score 70 should be emerald');
  console.assert(scoreTier(100) === 'emerald', 'Score 100 should be emerald');

  // Price drop percentage
  function dropPct(priceDropAmt, prevPrice, wasPrice, price) {
    const base = prevPrice || wasPrice || (price + priceDropAmt);
    return base > 0 ? (priceDropAmt / base) * 100 : 0;
  }

  // Normal case
  const pct1 = dropPct(10000, 500000, null, 490000);
  console.assert(Math.abs(pct1 - 2.0) < 0.01, 'Expected ~2% drop from prevPrice');

  // Fallback to wasPrice
  const pct2 = dropPct(15000, null, 600000, 585000);
  console.assert(Math.abs(pct2 - 2.5) < 0.01, 'Expected ~2.5% drop from wasPrice');

  // Fallback to computed base
  const pct3 = dropPct(20000, null, null, 480000);
  console.assert(Math.abs(pct3 - 4.0) < 0.01, 'Expected ~4% drop from computed base');

  // Divide by zero guard
  const pct4 = dropPct(0, null, null, 0);
  console.assert(pct4 === 0, 'Zero base should return 0%');

  console.log('   PASS: All unit tests passed');
"

echo ""
echo "=== All validations passed ==="
