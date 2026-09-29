# Optimization Quick Reference

Quick commands for monitoring and deploying optimizations.

---

## Check Current Database Size

```bash
# Local MySQL
mysql -u root home_monitor -e "SELECT COUNT(*) as total_homes FROM homes; SELECT COUNT(*) as active_homes FROM homes WHERE status NOT IN ('SOLD','FUTURE');"

# PlanetScale
pscale shell home-monitor main
> SELECT COUNT(*) as total_homes FROM homes;
> SELECT COUNT(*) as active_homes FROM homes WHERE status NOT IN ('SOLD','FUTURE');
```

**Decision Matrix**:
- **< 10,000 homes**: Phase 1 only (already done ✅)
- **10,000 - 25,000 homes**: Deploy Phase 2 indexes
- **25,000 - 50,000 homes**: Deploy Phase 2 full (indexes + SQL scoring)
- **50,000+ homes**: Deploy Phase 3 (partitions + cache)

---

## Test API Performance

```bash
# Test response time (target: <300ms)
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3200/api/homes?city=Dublin"

# Test with filters
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3200/api/homes?city=Dublin&minBeds=3&maxPrice=800000"

# Check cache headers
curl -I "http://localhost:3200/api/filters"
# Should see: Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400
```

**Performance targets**:
- **Excellent**: <200ms
- **Good**: 200-400ms
- **Acceptable**: 400-600ms
- **Poor**: >600ms (deploy optimizations!)

---

## Deploy Phase 2: Composite Indexes

**When**: Database reaches 10,000 homes

```bash
# 1. Connect to PlanetScale
pscale shell home-monitor main

# 2. Run migration
# Copy/paste contents of db/migrations/03_add_composite_indexes.sql
# OR upload and execute in PlanetScale console

# 3. Verify indexes were created
SHOW INDEX FROM homes;

# 4. Test query performance
EXPLAIN SELECT h.*
FROM homes h
JOIN communities c ON h.community_id = c.id
WHERE h.status = 'available' AND c.city_id = 1
ORDER BY h.price LIMIT 50;
# Should use: idx_community_status_price

# 5. Update optimizer statistics
ANALYZE TABLE homes;
ANALYZE TABLE price_history;
ANALYZE TABLE communities;
```

**Expected improvements**:
- Query time: 150ms → 30-40ms (4-5x faster)
- No code changes required
- Immediate benefit

---

## Monitor PlanetScale Usage

```bash
# Check row reads (CLI)
pscale database insights home-monitor main

# Check via web
# Visit: https://app.planetscale.com/[org]/home-monitor/main/insights
# Look for: "Row reads per second"
# Target: <1000/sec during peak
```

**Free tier limits**:
- ✅ Storage: 5 GB
- ⚠️ Row reads: 1 billion/month (monitor this!)
- ✅ Rows written: 10 million/month

**Current estimated usage** (Phase 1 complete):
- Row reads: ~15M/month (1.5% of limit)
- Storage: ~500 MB (10% of limit)

---

## Monitor Vercel Performance

```bash
# View recent deployments
vercel ls

# View logs
vercel logs

# Check function performance in web UI
# Visit: https://vercel.com/[org]/home-monitor/functions
```

**Free tier limits**:
- ✅ Function execution: 10s max (currently ~200ms)
- ✅ Bandwidth: 100 GB/month (currently ~2 GB/month)
- ✅ Invocations: 100K/day (currently ~500/day)

---

## Clear Stats Cache (If Needed)

If stats are stale after scraper run:

```bash
# Restart Vercel function (redeploy)
cd ui
vercel --prod

# Or wait 1 hour for automatic cache expiry
```

**Note**: Stats cache automatically expires after 1 hour.

---

## Rollback Optimizations

### Rollback Phase 1 (Cache & MAX_CANDIDATES)

```bash
cd ui/src/app/api

# Edit filters/route.ts - remove cache headers
# Edit homes/route.ts - restore MAX_CANDIDATES = 5000
# Edit homes/route.ts - remove getCachedStats() function

git checkout main -- ui/src/app/api/filters/route.ts
git checkout main -- ui/src/app/api/homes/route.ts
```

### Rollback Phase 2 (Indexes)

```sql
-- Connect to database
pscale shell home-monitor main

-- Drop composite indexes
DROP INDEX idx_community_status_price ON homes;
DROP INDEX idx_status_first_seen ON homes;
DROP INDEX idx_status_drop_lastseen ON homes;
DROP INDEX idx_status_beds_price ON homes;
DROP INDEX idx_community_lastseen ON homes;
DROP INDEX idx_home_changed ON price_history;
DROP INDEX idx_city_builder ON communities;
DROP INDEX idx_city_rating ON schools;
```

---

## Common Issues & Fixes

### Issue: API response time >500ms

**Check**:
1. Database size: `SELECT COUNT(*) FROM homes;`
2. Query execution: `EXPLAIN SELECT ...` (check if indexes used)
3. Cache hit rate: Restart API to reset stats cache

**Fix**:
- If >10K homes: Deploy Phase 2 indexes
- If >25K homes: Deploy SQL-based scoring
- Check if MAX_CANDIDATES too high

### Issue: PlanetScale row reads >50% of limit

**Check**:
```sql
-- Check stats cache is working
SELECT COUNT(*) FROM homes WHERE status NOT IN ('SOLD','FUTURE');
-- This query should be cached, not run on every API call
```

**Fix**:
- Verify getCachedStats() is being called
- Reduce MAX_CANDIDATES further (try 500)
- Deploy composite indexes to reduce rows scanned

### Issue: Stale data in stats

**Cause**: Stats are cached for 1 hour

**Fix**:
- Wait for cache to expire (automatic)
- Restart Vercel function: `vercel --prod`
- Or accept 1-hour delay (stats change slowly anyway)

---

## Performance Benchmarks

### Expected Response Times

| Homes | Phase 1 Only | Phase 2 (Indexes) | Phase 2 (Full) |
|-------|--------------|-------------------|----------------|
| 5K    | ~150ms       | ~80ms             | ~60ms          |
| 10K   | ~200ms       | ~100ms            | ~80ms          |
| 25K   | ~400ms       | ~150ms            | ~100ms         |
| 50K   | ~800ms ⚠️    | ~200ms            | ~150ms         |

### Database Row Reads (per day)

| Homes | Phase 1 Only | Phase 2 (Indexes) | With Cache |
|-------|--------------|-------------------|------------|
| 5K    | 500K         | 200K              | 50K        |
| 10K   | 1M           | 400K              | 100K       |
| 25K   | 2.5M         | 1M                | 250K       |
| 50K   | 5M           | 2M                | 500K       |

---

## Next Steps

1. ✅ **Phase 1 complete**: Caching and reduced data transfer
2. **Check database size**: Run `SELECT COUNT(*) FROM homes;`
3. **Monitor performance**: Use curl commands above
4. **Deploy Phase 2**: When database reaches 10K homes
5. **Monitor limits**: Check PlanetScale row reads monthly

**Good to go!** Current optimizations support up to 25K homes comfortably.
