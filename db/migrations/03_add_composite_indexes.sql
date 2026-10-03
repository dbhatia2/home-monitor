-- ============================================================
-- Migration: Add Composite Indexes
-- Description: Optimize indexes for common query patterns
-- Expected speedup: 3-5x faster for multi-filter queries
-- ============================================================

-- Check current indexes
SELECT
  TABLE_NAME,
  INDEX_NAME,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns,
  INDEX_TYPE,
  NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'home_monitor'
AND TABLE_NAME = 'homes'
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY TABLE_NAME, INDEX_NAME;

-- ============================================================
-- STEP 1: City + Status + Price (Most Common Query Pattern)
-- ============================================================

-- Query pattern:
-- SELECT * FROM homes h
-- JOIN communities c ON h.community_id = c.id
-- WHERE c.city_id = ? AND h.status = 'available'
-- ORDER BY h.price

-- Current: Uses idx_community, then filters status, then sorts by price
-- Optimized: Covering index handles all operations

CREATE INDEX idx_community_status_price ON homes(community_id, status, price);

-- Test query
EXPLAIN
SELECT h.id, h.address, h.price, h.beds, h.baths
FROM homes h
JOIN communities c ON h.community_id = c.id
WHERE c.city_id = 1
AND h.status = 'available'
ORDER BY h.price
LIMIT 20;
-- Should use: idx_community_status_price with Using index condition

-- ============================================================
-- STEP 2: Status + First Seen (Recent Listings)
-- ============================================================

-- Query pattern:
-- SELECT * FROM homes
-- WHERE status = 'available'
-- ORDER BY first_seen_at DESC
-- LIMIT 20

CREATE INDEX idx_status_first_seen ON homes(status, first_seen_at DESC);

-- Test query
EXPLAIN
SELECT * FROM homes
WHERE status = 'available'
ORDER BY first_seen_at DESC
LIMIT 20;
-- Should use: idx_status_first_seen with no filesort

-- ============================================================
-- STEP 3: Status + Price Drop + Last Seen (Price Drop Alerts)
-- ============================================================

-- Query pattern:
-- SELECT * FROM homes
-- WHERE status = 'available'
-- AND price_drop = 1
-- ORDER BY last_seen_at DESC

CREATE INDEX idx_status_drop_lastseen ON homes(status, price_drop, last_seen_at DESC);

-- Test query
EXPLAIN
SELECT * FROM homes
WHERE status = 'available'
AND price_drop = 1
ORDER BY last_seen_at DESC
LIMIT 50;
-- Should use: idx_status_drop_lastseen with Using index condition

-- ============================================================
-- STEP 4: Status + Beds + Price (Bedroom Filter)
-- ============================================================

-- Query pattern:
-- SELECT * FROM homes
-- WHERE status = 'available'
-- AND beds >= 3
-- AND price BETWEEN 400000 AND 600000

CREATE INDEX idx_status_beds_price ON homes(status, beds, price);

-- Test query
EXPLAIN
SELECT * FROM homes
WHERE status = 'available'
AND beds >= 3
AND price BETWEEN 400000 AND 600000
ORDER BY price;
-- Should use: idx_status_beds_price with Using index condition

-- ============================================================
-- STEP 5: Community + Last Seen (Community Detail Page)
-- ============================================================

-- Query pattern:
-- SELECT * FROM homes
-- WHERE community_id = ?
-- ORDER BY last_seen_at DESC

CREATE INDEX idx_community_lastseen ON homes(community_id, last_seen_at DESC);

-- Test query
EXPLAIN
SELECT * FROM homes
WHERE community_id = 10
ORDER BY last_seen_at DESC;
-- Should use: idx_community_lastseen

-- ============================================================
-- STEP 6: Price History - Home ID + Changed At
-- ============================================================

-- Query pattern:
-- SELECT * FROM price_history
-- WHERE home_id = ?
-- ORDER BY changed_at DESC

-- Current: Has idx_home_id, but needs sorting
-- Optimized: Covering index

CREATE INDEX idx_home_changed ON price_history(home_id, changed_at DESC);

-- Test query
EXPLAIN
SELECT * FROM price_history
WHERE home_id = 123
ORDER BY changed_at DESC;
-- Should use: idx_home_changed with no filesort

-- ============================================================
-- STEP 7: Communities - City + Builder
-- ============================================================

-- Query pattern:
-- SELECT * FROM communities
-- WHERE city_id = ? AND builder_id = ?

CREATE INDEX idx_city_builder ON communities(city_id, builder_id);

-- Test query
EXPLAIN
SELECT * FROM communities
WHERE city_id = 1
AND builder_id = 2;
-- Should use: idx_city_builder

-- ============================================================
-- STEP 8: Schools - City + Rating (School Search)
-- ============================================================

-- Query pattern:
-- SELECT * FROM schools
-- WHERE city_id = ?
-- AND rating_gs >= 7
-- ORDER BY rating_gs DESC

CREATE INDEX idx_city_rating ON schools(city_id, rating_gs DESC);

-- Test query
EXPLAIN
SELECT * FROM schools
WHERE city_id = 1
AND rating_gs >= 7
ORDER BY rating_gs DESC;
-- Should use: idx_city_rating

-- ============================================================
-- STEP 9: Remove Redundant Indexes (Optional)
-- ============================================================

-- WARNING: Only drop indexes if you're SURE they're redundant
-- Analyze query patterns first with:
-- SELECT * FROM sys.schema_unused_indexes WHERE object_schema = 'home_monitor';

-- If idx_community_status_price exists, idx_status may be redundant for queries
-- that also filter by community
-- BUT: Keep idx_status if you have queries that filter ONLY by status

-- Example of safe removal:
-- DROP INDEX idx_price ON homes;  -- Redundant with idx_community_status_price
-- DROP INDEX idx_last_seen ON homes;  -- Redundant with idx_status_first_seen

-- Recommended: Keep all existing indexes for now, monitor usage over time

-- ============================================================
-- STEP 10: Full-Text Search Index (Optional, if implementing search)
-- ============================================================

-- For searching homes by address
-- ALTER TABLE homes ADD FULLTEXT INDEX ft_address (address);

-- For searching communities by name
-- ALTER TABLE communities ADD FULLTEXT INDEX ft_name (name);

-- Test full-text search:
-- SELECT * FROM homes WHERE MATCH(address) AGAINST('dublin ranch' IN NATURAL LANGUAGE MODE);

-- ============================================================
-- Performance Testing
-- ============================================================

-- Test 1: Complex multi-filter query
EXPLAIN ANALYZE
SELECT h.*, c.name as community_name, c.url
FROM homes h
JOIN communities c ON h.community_id = c.id
WHERE h.status = 'available'
AND h.beds >= 3
AND h.price BETWEEN 400000 AND 600000
ORDER BY h.price
LIMIT 20;

-- Test 2: Price drop alerts
EXPLAIN ANALYZE
SELECT * FROM homes
WHERE status = 'available'
AND price_drop = 1
ORDER BY last_seen_at DESC
LIMIT 50;

-- Test 3: Recent listings
EXPLAIN ANALYZE
SELECT * FROM homes
WHERE status = 'available'
ORDER BY first_seen_at DESC
LIMIT 20;

-- Test 4: Price history for specific home
EXPLAIN ANALYZE
SELECT * FROM price_history
WHERE home_id = 123
ORDER BY changed_at DESC;

-- ============================================================
-- Index Usage Statistics (Run after 1 week in production)
-- ============================================================

-- Check which indexes are actually being used
SELECT
  OBJECT_SCHEMA,
  OBJECT_NAME,
  INDEX_NAME,
  COUNT_STAR AS queries_using_index,
  COUNT_READ AS rows_read,
  SUM_TIMER_WAIT / 1000000000000 AS total_latency_sec
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE OBJECT_SCHEMA = 'home_monitor'
AND INDEX_NAME IS NOT NULL
ORDER BY COUNT_STAR DESC;

-- Find unused indexes (candidates for removal)
SELECT
  OBJECT_SCHEMA,
  OBJECT_NAME,
  INDEX_NAME
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE OBJECT_SCHEMA = 'home_monitor'
AND INDEX_NAME IS NOT NULL
AND INDEX_NAME != 'PRIMARY'
AND COUNT_STAR = 0
ORDER BY OBJECT_NAME, INDEX_NAME;

-- ============================================================
-- Index Cardinality Check
-- ============================================================

-- Verify index selectivity (higher = better)
SELECT
  TABLE_NAME,
  INDEX_NAME,
  CARDINALITY,
  (CARDINALITY / TABLE_ROWS) * 100 AS selectivity_pct
FROM information_schema.STATISTICS s
JOIN information_schema.TABLES t USING (TABLE_SCHEMA, TABLE_NAME)
WHERE s.TABLE_SCHEMA = 'home_monitor'
AND s.TABLE_NAME = 'homes'
AND s.SEQ_IN_INDEX = 1  -- First column of index
ORDER BY selectivity_pct DESC;

-- Good selectivity: >10%
-- Medium: 1-10%
-- Poor: <1% (consider removing index)

-- ============================================================
-- Analyze Tables (Update Statistics)
-- ============================================================

-- Run after adding indexes to update optimizer statistics
ANALYZE TABLE homes;
ANALYZE TABLE price_history;
ANALYZE TABLE communities;
ANALYZE TABLE schools;

-- ============================================================
-- Verification
-- ============================================================

-- List all indexes on homes table
SHOW INDEX FROM homes;

-- Check index size
SELECT
  TABLE_NAME,
  INDEX_NAME,
  ROUND(STAT_VALUE * @@innodb_page_size / 1024 / 1024, 2) AS size_mb
FROM mysql.innodb_index_stats
WHERE DATABASE_NAME = 'home_monitor'
AND TABLE_NAME = 'homes'
AND STAT_NAME = 'size'
ORDER BY size_mb DESC;

-- Total index size per table
SELECT
  TABLE_NAME,
  ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_size_mb,
  ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_size_mb,
  ROUND((INDEX_LENGTH / DATA_LENGTH) * 100, 2) AS index_overhead_pct
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'home_monitor'
AND TABLE_NAME IN ('homes', 'price_history', 'communities')
ORDER BY INDEX_LENGTH DESC;

-- Acceptable index overhead: 20-50% of data size
-- High overhead: >100% (may have too many indexes)

-- ============================================================
-- Rollback: Remove Composite Indexes
-- ============================================================

/*
DROP INDEX idx_community_status_price ON homes;
DROP INDEX idx_status_first_seen ON homes;
DROP INDEX idx_status_drop_lastseen ON homes;
DROP INDEX idx_status_beds_price ON homes;
DROP INDEX idx_community_lastseen ON homes;
DROP INDEX idx_home_changed ON price_history;
DROP INDEX idx_city_builder ON communities;
DROP INDEX idx_city_rating ON schools;
*/

-- ============================================================
-- Query Optimization Tips
-- ============================================================

-- 1. Always use EXPLAIN before optimizing:
--    EXPLAIN SELECT ...
--
-- 2. Check if index is used:
--    Look for "Using index" or "Using index condition" in Extra column
--
-- 3. Avoid filesort:
--    If Extra shows "Using filesort", add covering index with ORDER BY columns
--
-- 4. Covering index is best:
--    Index contains ALL columns needed (SELECT + WHERE + ORDER BY)
--
-- 5. Left-prefix rule:
--    Index on (a, b, c) helps queries filtering:
--    - a
--    - a, b
--    - a, b, c
--    But NOT: b, c alone
--
-- 6. Order matters:
--    Put equality (=) filters before range (<, >, BETWEEN) in index
--
-- 7. Monitor in production:
--    Use performance_schema to find slow queries and missing indexes

-- ============================================================
-- COMPLETED: Composite index optimization
-- Expected result: 3-5x faster multi-filter queries
-- Next step: Monitor index usage and remove unused indexes
-- ============================================================
