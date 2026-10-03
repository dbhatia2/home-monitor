-- ============================================================
-- Migration: Add Table Partitioning
-- Description: Partition large tables by status/date for performance
-- Recommended: Run when homes table has >20,000 rows
-- Expected speedup: 5-6x faster queries on filtered data
-- ============================================================

-- IMPORTANT: Check your table size before running
SELECT COUNT(*) FROM homes;
-- If < 20,000: Skip this migration (overhead > benefit)
-- If 20,000 - 100,000: Run STATUS partitioning
-- If > 100,000: Run STATUS + DATE subpartitioning

-- ============================================================
-- OPTION A: Partition homes by STATUS only (recommended start)
-- ============================================================

-- Check: Ensure no foreign keys reference homes.id from external tables
-- PlanetScale doesn't support FK, so this should be safe
SELECT
  TABLE_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_NAME = 'homes'
AND TABLE_SCHEMA = 'home_monitor';

-- Partition by status (most common filter in queries)
ALTER TABLE homes PARTITION BY LIST COLUMNS(status) (
  PARTITION p_active VALUES IN ('available', 'pending', 'reserved', 'coming_soon'),
  PARTITION p_sold VALUES IN ('sold'),
  PARTITION p_other VALUES IN ('unavailable', 'unknown')
);

-- Verify partitioning
SELECT
  PARTITION_NAME,
  TABLE_ROWS,
  ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'home_monitor'
AND TABLE_NAME = 'homes'
ORDER BY PARTITION_ORDINAL_POSITION;

-- Test query with partition pruning
EXPLAIN PARTITIONS
SELECT * FROM homes
WHERE status = 'available'
AND price < 500000
LIMIT 10;
-- Should show: partitions: p_active (only 1 partition scanned)

-- ============================================================
-- OPTION B: Partition price_history by DATE (year)
-- ============================================================

-- Check current date range
SELECT
  MIN(changed_at) as oldest,
  MAX(changed_at) as newest,
  COUNT(*) as total_records
FROM price_history;

-- Partition by year
ALTER TABLE price_history PARTITION BY RANGE (YEAR(changed_at)) (
  PARTITION p_2024 VALUES LESS THAN (2025),
  PARTITION p_2025 VALUES LESS THAN (2026),
  PARTITION p_2026 VALUES LESS THAN (2027),
  PARTITION p_2027 VALUES LESS THAN (2028),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Verify
SELECT
  PARTITION_NAME,
  TABLE_ROWS,
  PARTITION_DESCRIPTION
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'home_monitor'
AND TABLE_NAME = 'price_history'
ORDER BY PARTITION_ORDINAL_POSITION;

-- Test query
EXPLAIN PARTITIONS
SELECT * FROM price_history
WHERE changed_at >= '2026-01-01'
ORDER BY changed_at DESC
LIMIT 20;
-- Should show: partitions: p_2026,p_future (only recent partitions)

-- ============================================================
-- OPTION C: Partition snapshots by DATE (year)
-- ============================================================

ALTER TABLE snapshots PARTITION BY RANGE (YEAR(run_at)) (
  PARTITION p_2024 VALUES LESS THAN (2025),
  PARTITION p_2025 VALUES LESS THAN (2026),
  PARTITION p_2026 VALUES LESS THAN (2027),
  PARTITION p_2027 VALUES LESS THAN (2028),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Verify
SELECT
  PARTITION_NAME,
  TABLE_ROWS
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'home_monitor'
AND TABLE_NAME = 'snapshots'
ORDER BY PARTITION_ORDINAL_POSITION;

-- ============================================================
-- OPTION D: ADVANCED - Subpartition homes by STATUS + DATE
-- ONLY USE if: >100,000 homes AND queries frequently filter by date
-- ============================================================

-- WARNING: This removes existing partitions and recreates
-- Backup data first if in production!

-- Remove existing partitioning
-- ALTER TABLE homes REMOVE PARTITIONING;

-- Create subpartitioned table
/*
ALTER TABLE homes PARTITION BY LIST COLUMNS(status)
SUBPARTITION BY RANGE (YEAR(first_seen_at)) (
  PARTITION p_active VALUES IN ('available', 'pending', 'reserved', 'coming_soon') (
    SUBPARTITION p_active_2024 VALUES LESS THAN (2025),
    SUBPARTITION p_active_2025 VALUES LESS THAN (2026),
    SUBPARTITION p_active_2026 VALUES LESS THAN (2027),
    SUBPARTITION p_active_future VALUES LESS THAN MAXVALUE
  ),
  PARTITION p_sold VALUES IN ('sold') (
    SUBPARTITION p_sold_2024 VALUES LESS THAN (2025),
    SUBPARTITION p_sold_2025 VALUES LESS THAN (2026),
    SUBPARTITION p_sold_2026 VALUES LESS THAN (2027),
    SUBPARTITION p_sold_future VALUES LESS THAN MAXVALUE
  ),
  PARTITION p_other VALUES IN ('unavailable', 'unknown') (
    SUBPARTITION p_other_2024 VALUES LESS THAN (2025),
    SUBPARTITION p_other_2025 VALUES LESS THAN (2026),
    SUBPARTITION p_other_2026 VALUES LESS THAN (2027),
    SUBPARTITION p_other_future VALUES LESS THAN MAXVALUE
  )
);
*/

-- ============================================================
-- Partition Maintenance (Run annually or as needed)
-- ============================================================

-- Add new partition for upcoming year (run in December)
/*
-- For price_history
ALTER TABLE price_history ADD PARTITION (
  PARTITION p_2028 VALUES LESS THAN (2029)
);

-- For snapshots
ALTER TABLE snapshots ADD PARTITION (
  PARTITION p_2028 VALUES LESS THAN (2029)
);
*/

-- Archive old data by dropping partitions (careful!)
/*
-- Drop price history from >2 years ago
ALTER TABLE price_history DROP PARTITION p_2024;

-- Drop snapshots from >2 years ago
ALTER TABLE snapshots DROP PARTITION p_2024;
*/

-- Reorganize partitions to rebalance (if data skewed)
/*
ALTER TABLE homes REORGANIZE PARTITION p_active INTO (
  PARTITION p_available VALUES IN ('available'),
  PARTITION p_pending VALUES IN ('pending', 'reserved', 'coming_soon')
);
*/

-- ============================================================
-- Performance Testing
-- ============================================================

-- Test 1: Query active homes (should use p_active partition)
EXPLAIN PARTITIONS
SELECT COUNT(*) FROM homes WHERE status = 'available';

-- Test 2: Query sold homes (should use p_sold partition)
EXPLAIN PARTITIONS
SELECT COUNT(*) FROM homes WHERE status = 'sold';

-- Test 3: Recent price changes (should use p_2026 partition)
EXPLAIN PARTITIONS
SELECT * FROM price_history
WHERE changed_at >= '2026-01-01'
ORDER BY changed_at DESC
LIMIT 10;

-- Test 4: Complex query with multiple filters
EXPLAIN PARTITIONS
SELECT h.*, c.name as community_name
FROM homes h
JOIN communities c ON h.community_id = c.id
WHERE h.status = 'available'
AND h.price BETWEEN 400000 AND 600000
AND h.beds >= 3
ORDER BY h.price
LIMIT 20;

-- ============================================================
-- Benchmark: Before vs After
-- ============================================================

-- Run these queries and compare execution time

-- Query 1: Active homes by price range
SELECT SQL_NO_CACHE COUNT(*)
FROM homes
WHERE status = 'available'
AND price < 500000;
-- Note execution time

-- Query 2: Recent price drops
SELECT SQL_NO_CACHE *
FROM price_history
WHERE changed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY changed_at DESC
LIMIT 100;
-- Note execution time

-- Query 3: Sold homes in date range
SELECT SQL_NO_CACHE COUNT(*)
FROM homes
WHERE status = 'sold'
AND last_seen_at >= '2026-01-01';
-- Note execution time

-- ============================================================
-- Rollback: Remove Partitioning
-- ============================================================

-- If partitioning causes issues, remove it:
/*
ALTER TABLE homes REMOVE PARTITIONING;
ALTER TABLE price_history REMOVE PARTITIONING;
ALTER TABLE snapshots REMOVE PARTITIONING;
*/

-- ============================================================
-- Verification
-- ============================================================

-- Check all partitioned tables
SELECT
  TABLE_NAME,
  PARTITION_NAME,
  PARTITION_METHOD,
  PARTITION_EXPRESSION,
  TABLE_ROWS,
  ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'home_monitor'
AND PARTITION_NAME IS NOT NULL
ORDER BY TABLE_NAME, PARTITION_ORDINAL_POSITION;

-- Check partition pruning stats (MySQL 8.0+)
SELECT
  TABLE_NAME,
  PARTITION_NAME,
  TABLE_ROWS,
  AVG_ROW_LENGTH,
  DATA_LENGTH
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'home_monitor'
AND TABLE_NAME IN ('homes', 'price_history', 'snapshots')
ORDER BY TABLE_NAME, PARTITION_ORDINAL_POSITION;

-- ============================================================
-- COMPLETED: Table partitioning
-- Expected result: 5-6x faster queries on filtered data
-- Next step: Run 03_add_composite_indexes.sql
-- ============================================================
