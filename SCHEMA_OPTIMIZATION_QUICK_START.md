# Schema Optimization Quick Start Guide

This guide provides step-by-step instructions to optimize your database schema for better performance and storage efficiency.

---

## 📊 Should You Optimize?

Run this query first to check your current database size:

```sql
-- Connect to your database
pscale shell home-monitor main  # Or your local: docker exec -it home_db mysql -u monitor -pmonitor123 home_monitor

-- Check table sizes
SELECT
  table_name,
  table_rows,
  ROUND(data_length / 1024 / 1024, 2) AS data_mb,
  ROUND(index_length / 1024 / 1024, 2) AS index_mb,
  ROUND((data_length + index_length) / 1024 / 1024, 2) AS total_mb
FROM information_schema.tables
WHERE table_schema = 'home_monitor'
ORDER BY (data_length + index_length) DESC;
```

**Decision Matrix:**

| Homes Count | Total Size | Action |
|-------------|------------|--------|
| < 5,000 | < 50 MB | Skip optimization (not worth effort) |
| 5,000 - 20,000 | 50-200 MB | **Run Migration 1** (data types) |
| 20,000 - 100,000 | 200MB - 1GB | **Run Migrations 1 + 2** (data types + partitions) |
| > 100,000 | > 1 GB | **Run all migrations** (1, 2, 3) |

---

## 🎯 Optimization Strategy Overview

### Migration 1: Data Type Optimization (Priority: HIGH)
**What**: Convert VARCHAR to ENUM/DECIMAL, shrink oversized columns
**Savings**: 70-75% reduction on optimized columns
**Time**: 5-10 minutes
**Risk**: Low (easily reversible)
**When**: Once you have >5,000 homes

### Migration 2: Table Partitioning (Priority: MEDIUM)
**What**: Split tables by status/date for faster queries
**Savings**: 5-6x query speedup on filtered data
**Time**: 10-20 minutes
**Risk**: Medium (test in dev first)
**When**: Once you have >20,000 homes

### Migration 3: Composite Indexes (Priority: MEDIUM)
**What**: Add multi-column indexes for common query patterns
**Savings**: 3-5x speedup on complex queries
**Time**: 5-10 minutes
**Risk**: Low (just adds indexes)
**When**: If queries are slow (>300ms)

---

## 🚀 Execution Instructions

### Prerequisites

**Option A: Local Database (Testing)**
```bash
# Make sure your local database is running
docker compose up -d mysql

# Backup first
docker exec home_db mysqldump -u monitor -pmonitor123 home_monitor > backup_before_optimization.sql

# Connect to database
docker exec -it home_db mysql -u monitor -pmonitor123 home_monitor
```

**Option B: PlanetScale (Production)**
```bash
# Create a backup branch first
pscale branch create home-monitor backup-$(date +%Y%m%d)

# Connect to main branch
pscale shell home-monitor main

# Or create dev branch for testing
pscale branch create home-monitor optimize-test
pscale shell home-monitor optimize-test
```

---

### Migration 1: Data Type Optimization

**⏱️ Estimated time: 5-10 minutes**

```bash
# Copy migration file content
cat db/migrations/01_optimize_datatypes.sql

# In PlanetScale or MySQL shell, run step by step:
# DO NOT copy-paste entire file at once!
# Run each STEP separately and verify results
```

**Step-by-step execution:**

1. **Test on local first** (if you have local data):
   ```bash
   docker exec -i home_db mysql -u monitor -pmonitor123 home_monitor < db/migrations/01_optimize_datatypes.sql
   ```

2. **Apply to PlanetScale dev branch**:
   ```bash
   pscale shell home-monitor optimize-test
   # Then copy-paste each STEP from 01_optimize_datatypes.sql
   ```

3. **Verify changes**:
   ```sql
   -- Check new data types
   DESCRIBE homes;

   -- Verify data integrity
   SELECT COUNT(*) FROM homes WHERE status IS NULL;  -- Should be 0
   SELECT COUNT(*) FROM homes WHERE baths IS NULL AND baths != '';  -- Should be 0

   -- Check storage savings
   SELECT
     table_name,
     ROUND((data_length + index_length) / 1024 / 1024, 2) AS total_mb
   FROM information_schema.tables
   WHERE table_schema = 'home_monitor'
   AND table_name = 'homes';
   ```

4. **If successful, promote to production**:
   ```bash
   pscale deploy-request create home-monitor optimize-test
   pscale deploy-request deploy home-monitor <request-number>
   ```

---

### Migration 2: Table Partitioning

**⏱️ Estimated time: 10-20 minutes**
**⚠️ Recommended: >20,000 homes**

```bash
# Check if you should partition
pscale shell home-monitor main

SELECT COUNT(*) FROM homes;
-- If < 20,000: Skip this migration
-- If > 20,000: Continue
```

**Execution:**

```sql
-- Copy content from db/migrations/02_add_partitions.sql
-- Start with OPTION A (partition by status only)

-- Run partitioning
ALTER TABLE homes PARTITION BY LIST COLUMNS(status) (
  PARTITION p_active VALUES IN ('available', 'pending', 'reserved', 'coming_soon'),
  PARTITION p_sold VALUES IN ('sold'),
  PARTITION p_other VALUES IN ('unavailable', 'unknown')
);

-- Verify
SELECT
  PARTITION_NAME,
  TABLE_ROWS,
  ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'home_monitor'
AND TABLE_NAME = 'homes';

-- Test query performance
EXPLAIN PARTITIONS
SELECT * FROM homes WHERE status = 'available' LIMIT 10;
-- Should show: partitions: p_active
```

**If successful, partition price_history too:**

```sql
ALTER TABLE price_history PARTITION BY RANGE (YEAR(changed_at)) (
  PARTITION p_2024 VALUES LESS THAN (2025),
  PARTITION p_2025 VALUES LESS THAN (2026),
  PARTITION p_2026 VALUES LESS THAN (2027),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

---

### Migration 3: Composite Indexes

**⏱️ Estimated time: 5-10 minutes**
**💡 Recommended: If queries are slow**

```sql
-- Check current query performance first
EXPLAIN SELECT * FROM homes
WHERE status = 'available'
ORDER BY first_seen_at DESC
LIMIT 20;
-- Note: type, possible_keys, Extra columns

-- Run migrations from db/migrations/03_add_composite_indexes.sql
-- Add indexes one by one

CREATE INDEX idx_community_status_price ON homes(community_id, status, price);
CREATE INDEX idx_status_first_seen ON homes(status, first_seen_at DESC);
CREATE INDEX idx_status_drop_lastseen ON homes(status, price_drop, last_seen_at DESC);

-- Update statistics
ANALYZE TABLE homes;

-- Re-test query
EXPLAIN SELECT * FROM homes
WHERE status = 'available'
ORDER BY first_seen_at DESC
LIMIT 20;
-- Should now use: idx_status_first_seen
```

---

## 📈 Before/After Benchmarks

Run these queries before and after optimization to measure improvement:

```sql
-- Benchmark 1: Active homes query
SET @start = NOW(6);
SELECT COUNT(*) FROM homes WHERE status = 'available';
SELECT TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) / 1000 AS elapsed_ms;

-- Benchmark 2: Price filter
SET @start = NOW(6);
SELECT * FROM homes
WHERE status = 'available' AND price < 500000
LIMIT 100;
SELECT TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) / 1000 AS elapsed_ms;

-- Benchmark 3: Recent listings
SET @start = NOW(6);
SELECT * FROM homes
WHERE status = 'available'
ORDER BY first_seen_at DESC
LIMIT 20;
SELECT TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) / 1000 AS elapsed_ms;

-- Benchmark 4: Complex query
SET @start = NOW(6);
SELECT h.*, c.name
FROM homes h
JOIN communities c ON h.community_id = c.id
WHERE h.status = 'available'
AND h.beds >= 3
AND h.price BETWEEN 400000 AND 600000
ORDER BY h.price
LIMIT 20;
SELECT TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) / 1000 AS elapsed_ms;
```

**Expected improvements:**

| Query | Before | After Migrations | Speedup |
|-------|--------|------------------|---------|
| Count active | 150ms | 25ms | 6x |
| Price filter | 280ms | 45ms | 6.2x |
| Recent listings | 200ms | 15ms | 13x |
| Complex join | 450ms | 75ms | 6x |

---

## ⚠️ Rollback Procedures

### Rollback Migration 1 (Data Types)

```sql
-- Revert status to VARCHAR
ALTER TABLE homes MODIFY status VARCHAR(30);
ALTER TABLE communities MODIFY status VARCHAR(20);

-- Revert baths to VARCHAR
ALTER TABLE homes MODIFY baths VARCHAR(20);

-- Revert drop_source to VARCHAR
ALTER TABLE homes MODIFY drop_source VARCHAR(20);
ALTER TABLE price_history MODIFY drop_source VARCHAR(20);

-- Revert homesite to original size
ALTER TABLE homes MODIFY homesite VARCHAR(20);

-- Revert distance to VARCHAR
ALTER TABLE community_schools ADD COLUMN distance_old VARCHAR(20);
UPDATE community_schools SET distance_old = CONCAT(ROUND(distance / 1609, 1), ' mi');
ALTER TABLE community_schools DROP COLUMN distance;
ALTER TABLE community_schools CHANGE distance_old distance VARCHAR(20);
```

### Rollback Migration 2 (Partitioning)

```sql
-- Remove partitioning (data preserved)
ALTER TABLE homes REMOVE PARTITIONING;
ALTER TABLE price_history REMOVE PARTITIONING;
ALTER TABLE snapshots REMOVE PARTITIONING;
```

### Rollback Migration 3 (Indexes)

```sql
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

## 🔍 Monitoring Post-Optimization

### Weekly Check (First Month)

```sql
-- Check partition distribution
SELECT
  PARTITION_NAME,
  TABLE_ROWS,
  ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'home_monitor'
AND TABLE_NAME = 'homes'
ORDER BY TABLE_ROWS DESC;

-- Check index usage
SELECT
  INDEX_NAME,
  CARDINALITY,
  (CARDINALITY / TABLE_ROWS) * 100 AS selectivity_pct
FROM information_schema.STATISTICS s
JOIN information_schema.TABLES t USING (TABLE_SCHEMA, TABLE_NAME)
WHERE s.TABLE_SCHEMA = 'home_monitor'
AND s.TABLE_NAME = 'homes'
AND s.SEQ_IN_INDEX = 1
ORDER BY CARDINALITY DESC;
```

### Monthly Maintenance

```sql
-- Update statistics for optimizer
ANALYZE TABLE homes;
ANALYZE TABLE price_history;
ANALYZE TABLE communities;

-- Check for slow queries (if performance_schema enabled)
SELECT
  DIGEST_TEXT,
  COUNT_STAR,
  AVG_TIMER_WAIT / 1000000000 AS avg_ms,
  SUM_ROWS_EXAMINED / COUNT_STAR AS avg_rows_examined
FROM performance_schema.events_statements_summary_by_digest
WHERE SCHEMA_NAME = 'home_monitor'
ORDER BY AVG_TIMER_WAIT DESC
LIMIT 10;
```

### Annual Tasks

```sql
-- Add new partition for upcoming year (run in December)
ALTER TABLE price_history ADD PARTITION (
  PARTITION p_2027 VALUES LESS THAN (2028)
);

-- Drop old partitions (archive data first!)
-- BACKUP FIRST: SELECT * FROM price_history PARTITION (p_2024) INTO OUTFILE ...
ALTER TABLE price_history DROP PARTITION p_2024;
```

---

## 📋 Checklist

### Before Optimization
- [ ] Backup database (`mysqldump` or PlanetScale branch)
- [ ] Check table sizes and row counts
- [ ] Run benchmark queries and record times
- [ ] Test on local or dev branch first

### Migration 1: Data Types
- [ ] Check distinct values for ENUM columns
- [ ] Check max lengths for VARCHAR shrinking
- [ ] Run migration step-by-step
- [ ] Verify data integrity (no NULLs)
- [ ] Check storage savings

### Migration 2: Partitioning
- [ ] Confirm >20,000 homes before partitioning
- [ ] Partition by status first (OPTION A)
- [ ] Verify partition distribution
- [ ] Test query with EXPLAIN PARTITIONS
- [ ] Partition price_history if beneficial

### Migration 3: Indexes
- [ ] Add composite indexes
- [ ] Run ANALYZE TABLE
- [ ] Test queries with EXPLAIN
- [ ] Monitor index usage for 1 week
- [ ] Drop unused indexes if any

### After Optimization
- [ ] Run benchmark queries again
- [ ] Compare before/after metrics
- [ ] Monitor for 1 week
- [ ] Document results
- [ ] Update app code if needed (e.g., distance in meters)

---

## 🆘 Troubleshooting

### "Partition requires key column in partitioning function"
**Cause**: Column used in partition must be in PRIMARY KEY
**Fix**: Use different partition strategy or add column to primary key

### "ENUM value not found"
**Cause**: Trying to insert value not in ENUM list
**Fix**: Add value to ENUM:
```sql
ALTER TABLE homes MODIFY status ENUM('available', 'sold', ..., 'new_value');
```

### "Query slower after adding index"
**Cause**: MySQL optimizer chose wrong index
**Fix**: Force index usage:
```sql
SELECT * FROM homes USE INDEX (idx_community_status_price) WHERE ...;
```
Or drop unused indexes

### "Data truncated for column"
**Cause**: Existing data doesn't fit new data type
**Fix**: Check max values before shrinking:
```sql
SELECT MAX(LENGTH(column_name)) FROM table_name;
```

---

## 📚 Additional Resources

- **Full guide**: See `SCHEMA_OPTIMIZATION.md` for detailed explanations
- **Migration files**:
  - `db/migrations/01_optimize_datatypes.sql`
  - `db/migrations/02_add_partitions.sql`
  - `db/migrations/03_add_composite_indexes.sql`

- **PlanetScale docs**: https://planetscale.com/docs/concepts/partitioning
- **MySQL partitioning**: https://dev.mysql.com/doc/refman/8.0/en/partitioning.html
- **Index optimization**: https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html

---

**Recommendation**: Start with Migration 1 (data types) only. It provides the most benefit with lowest risk. Add partitioning and indexes later if needed.

**Expected total time**: 20-30 minutes for all three migrations
**Expected results**: 70% storage reduction, 5-6x faster queries
