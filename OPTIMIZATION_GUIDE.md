# Home Monitor Optimization & Compaction Guide

This guide covers optimization strategies for keeping your deployment lean and efficient on free tier limits.

---

## Database Optimization (PlanetScale)

### Free Tier Limits
- **Storage**: 5GB
- **Row reads**: 1 billion/month
- **Rows written**: 10 million/month
- **Connections**: Up to 1000 concurrent

### Current Usage Estimate
Based on your schema:
- ~500MB storage (homes, builders, communities, etc.)
- ~10M row reads/month (low traffic)
- ~100K row writes/month (daily scraper runs)

**Risk Level**: ✅ Low (well within limits)

### Data Compaction Strategies

#### 1. Archive Old Listings (Recommended)

**Problem**: Homes marked as "sold" still consume storage but aren't actively displayed.

**Solution**: Create an archive table for old listings:

```sql
-- Create archive table (run in PlanetScale shell)
CREATE TABLE homes_archive LIKE homes;

-- Move sold homes older than 90 days
INSERT INTO homes_archive
SELECT * FROM homes
WHERE status = 'sold'
AND updated_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Delete archived homes from main table
DELETE FROM homes
WHERE status = 'sold'
AND updated_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

**Automation**: Add to GitHub Actions workflow (monthly)

```yaml
# .github/workflows/monthly-archive.yml
name: Monthly Database Archive

on:
  schedule:
    - cron: '0 0 1 * *'  # 1st of each month at midnight UTC
  workflow_dispatch:

jobs:
  archive:
    runs-on: ubuntu-latest
    steps:
      - name: Archive old sold homes
        env:
          DB_HOST: ${{ secrets.DB_HOST }}
          DB_USER: ${{ secrets.DB_USER }}
          DB_PASS: ${{ secrets.DB_PASS }}
          DB_NAME: ${{ secrets.DB_NAME }}
        run: |
          mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME << 'EOF'
          INSERT INTO homes_archive SELECT * FROM homes
          WHERE status = 'sold' AND updated_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
          ON DUPLICATE KEY UPDATE id=id;

          DELETE FROM homes
          WHERE status = 'sold' AND updated_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
          EOF
```

**Expected Savings**: 30-50% storage reduction after first run

#### 2. Remove Duplicate Price History

**Problem**: Price changes table can grow large over time.

**Solution**: Keep only the latest price change per home:

```sql
-- Keep only most recent price change per home
DELETE ph1 FROM price_changes ph1
INNER JOIN (
  SELECT home_id, MAX(changed_at) as max_date
  FROM price_changes
  GROUP BY home_id
) ph2 ON ph1.home_id = ph2.home_id
WHERE ph1.changed_at < ph2.max_date;
```

**Expected Savings**: Minimal unless price changes frequently

#### 3. Optimize Image Storage

**Current**: Full image URLs stored as TEXT (variable length)

**Optimization**: Store only the image path, construct full URL in app:

```typescript
// Before (db.ts)
const imageUrl = row.image_url; // "https://cdn.example.com/homes/12345.jpg"

// After (more efficient)
const imagePath = row.image_path; // "homes/12345.jpg"
const imageUrl = `${CDN_BASE_URL}/${imagePath}`;
```

**Migration**:
```sql
-- Add new column
ALTER TABLE homes ADD COLUMN image_path VARCHAR(255);

-- Extract path from URL
UPDATE homes
SET image_path = SUBSTRING_INDEX(image_url, 'cdn.example.com/', -1);

-- Eventually drop old column (after app updated)
-- ALTER TABLE homes DROP COLUMN image_url;
```

**Expected Savings**: ~20% reduction in text storage

#### 4. Index Optimization

**Check index usage**:
```sql
-- In PlanetScale shell
SHOW INDEX FROM homes;
SHOW INDEX FROM communities;
```

**Remove unused indexes** (if any exist):
```sql
-- Only drop if you've verified they're not used
ALTER TABLE homes DROP INDEX unused_index_name;
```

---

## Mobile App Size Optimization

### Current Build Size Estimate
- **Android APK**: ~40-50MB (includes React Native runtime)
- **iOS IPA**: ~30-40MB

### Optimization Strategies

#### 1. Enable Hermes Engine (Already Done)

Check `mobile/app.json`:
```json
{
  "expo": {
    "jsEngine": "hermes"
  }
}
```

**Benefit**: ~30% smaller bundle size, faster startup

#### 2. Optimize Images

**Problem**: Large images in the app increase bundle size.

**Solution**: Use optimized formats and sizes:

```bash
# Install optimization tools
npm install -D @expo/image-utils

# In mobile/assets/, optimize images:
# - Convert PNG to WebP (smaller)
# - Resize to actual display size (don't ship 4K images)
# - Use @2x/@3x variants for different screen densities
```

#### 3. Remove Unused Dependencies

**Audit dependencies**:
```bash
cd mobile
npm install -g depcheck
depcheck
```

**Remove unused packages**:
```bash
npm uninstall <unused-package>
```

#### 4. Tree-Shaking & Minification

Already enabled by default in production builds. Verify in `eas.json`:

```json
{
  "build": {
    "production": {
      "optimization": "speed"  // or "size" for smaller builds
    }
  }
}
```

**Trade-off**:
- `"speed"`: Faster builds, larger size (~10% bigger)
- `"size"`: Slower builds, smaller size (recommended for production)

#### 5. Use EAS Update for OTA Changes

**Instead of rebuilding for every JS change**, use Over-The-Air updates:

```bash
# Install updates CLI
npm install -g eas-cli

# Publish update (users get it without reinstalling)
cd mobile
eas update --branch production --message "Bug fixes"
```

**Benefits**:
- No rebuild needed for JS changes
- Users get updates instantly
- Doesn't count against build minutes

---

## Next.js Build Optimization

### Current Build Size
Check after deployment:
```bash
cd ui
npm run build

# Output shows:
# ┌ λ /api/homes          123 kB
# ├ ○ /                   45 kB
# └ ○ /404                2 kB
```

### Optimization Strategies

#### 1. Enable Compression (Vercel does this automatically)

Vercel automatically compresses responses with gzip/brotli. No action needed.

#### 2. Optimize API Routes

**Current**: Fetches all columns from database

**Optimization**: Select only needed fields:

```typescript
// Before
const [rows] = await pool.query('SELECT * FROM homes WHERE city = ?', [city]);

// After (more efficient)
const [rows] = await pool.query(`
  SELECT id, address, price, beds, baths, sqft, image_url, city, builder
  FROM homes
  WHERE city = ?
`, [city]);
```

**Expected Improvement**: 20-30% faster API responses

#### 3. Add Response Caching

Cache frequently accessed endpoints:

```typescript
// ui/src/app/api/filters/route.ts
export async function GET(request: Request) {
  // Add cache headers
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
```

**Benefit**: Reduces database queries, faster responses

#### 4. Enable Incremental Static Regeneration (ISR)

For the home page:

```typescript
// ui/src/app/page.tsx
export const revalidate = 3600; // Regenerate every hour

export default async function Home() {
  // Fetch data at build time
  const homes = await fetchHomes();
  return <HomePage homes={homes} />;
}
```

**Benefit**: Near-instant page loads

---

## Scraper Optimization

### Current Behavior
- Runs daily
- Scrapes all cities/builders
- ~20-30 minutes runtime

### Optimization Strategies

#### 1. Parallel Scraping

**Current**: Sequential (one builder at a time)

**Optimization**: Parallel execution:

```python
# scheduler.py
import concurrent.futures

def scrape_all_parallel():
    builders = ['kbhome', 'lennar', 'taylor_morrison', 'toll_brothers']

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(scrape_builder, b) for b in builders]
        results = [f.result() for f in futures]

    return results
```

**Benefit**: 4x faster scraping (~5-7 minutes instead of 20-30)

#### 2. Conditional Scraping

**Skip builders with no recent changes**:

```python
# Only scrape if last update was >24 hours ago
last_update = get_last_builder_update('kbhome')
if (datetime.now() - last_update).hours < 24:
    print(f"Skipping kbhome, no changes expected")
    return
```

**Benefit**: Reduces unnecessary scraping, saves time

#### 3. Incremental Updates

**Instead of re-scraping everything**, only check for changes:

```python
# Compare checksums/hashes of listing pages
current_hash = hashlib.md5(page_content).hexdigest()
stored_hash = get_stored_hash('kbhome')

if current_hash == stored_hash:
    print("No changes detected, skipping detailed scrape")
    return
```

**Benefit**: 80-90% reduction in scraping time when no changes

---

## Monitoring & Alerts

### Set Up Usage Alerts

#### PlanetScale
1. Dashboard → Database → Insights
2. Enable email alerts at 80% storage
3. Monitor query performance

#### Vercel
1. Dashboard → Project → Analytics
2. Enable bandwidth alerts
3. Monitor function execution time

#### Expo
1. Dashboard → Project → Builds
2. Track build minutes used
3. Enable build failure alerts

### Recommended Monitoring Script

```bash
# scripts/check-usage.sh
#!/bin/bash

# Check PlanetScale storage
pscale database show home-monitor --format json | jq '.storage_used_mb'

# Check Vercel bandwidth (requires Vercel API token)
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/teams/TEAM_ID/usage"

# Check GitHub Actions minutes
gh api /repos/OWNER/REPO/actions/billing/usage
```

Run monthly:
```yaml
# .github/workflows/monthly-usage-report.yml
name: Monthly Usage Report

on:
  schedule:
    - cron: '0 0 1 * *'  # 1st of each month

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - run: |
          echo "PlanetScale: Check dashboard"
          echo "Vercel: Check dashboard"
          echo "GitHub Actions: ${{ github.run_number }} workflows this month"
```

---

## Free Tier Upgrade Paths

If you exceed free tier limits:

### PlanetScale
- **Free**: 5GB, 1B reads/month
- **Scaler**: $29/mo - 10GB, 10B reads/month
- **When to upgrade**: Storage >4GB or reads >800M/month

### Vercel
- **Free**: 100GB bandwidth/month
- **Pro**: $20/mo - 1TB bandwidth/month
- **When to upgrade**: Bandwidth >80GB/month

### Expo EAS
- **Free**: 30 builds/month
- **Production**: $29/mo - Unlimited builds
- **When to upgrade**: Need >30 builds/month (unlikely unless rebuilding frequently)

### GitHub Actions
- **Free**: 2000 minutes/month
- **Pro**: $4/mo - 3000 minutes/month
- **When to upgrade**: Using >1800 minutes/month

---

## Summary: Quick Wins

**Immediate (No Code Changes)**:
- ✅ All config files already created
- ✅ SSL for PlanetScale already enabled
- ✅ Hermes engine already enabled in mobile

**Low Effort (High Impact)**:
1. Archive sold homes >90 days old (50% storage savings)
2. Add cache headers to API routes (30% faster responses)
3. Use EAS Update instead of rebuilding for JS changes (save build minutes)

**Medium Effort (Optional)**:
1. Parallel scraper execution (4x faster)
2. Incremental scraping (skip unchanged builders)
3. Response caching with Vercel Edge (even faster APIs)

**When to Optimize**:
- **Now**: Archive old data if storage >2GB
- **At 80% of limits**: Implement caching and incremental scraping
- **If limits exceeded**: Consider paid tiers (still very affordable)

---

## Cost vs. Optimization Matrix

| Optimization | Complexity | Time Savings | Cost Savings | Recommended? |
|--------------|------------|--------------|--------------|--------------|
| Archive old data | Low | N/A | High (avoid paid tier) | ✅ Yes |
| Add caching | Low | High (faster API) | Medium (fewer queries) | ✅ Yes |
| Parallel scraping | Medium | High (4x faster) | None | ⚠️ If scraper slow |
| Incremental scraping | High | Very High (10x) | Medium | ⚠️ If hitting limits |
| Image optimization | Medium | Medium | Low | ⚠️ If app size issue |
| OTA updates | Low | N/A | High (save builds) | ✅ Yes |

**Recommendation**: Start with ✅ items, only do ⚠️ if needed.
