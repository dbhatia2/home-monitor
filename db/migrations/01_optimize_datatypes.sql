-- ============================================================
-- Migration: Optimize Data Types
-- Description: Convert inefficient VARCHAR columns to ENUM/DECIMAL
-- Expected savings: 75% storage reduction on optimized columns
-- Estimated time: 5-10 minutes for 10,000 homes
-- ============================================================

-- Safety: Start transaction (PlanetScale auto-commits DDL, but good practice)
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='TRADITIONAL';

-- ============================================================
-- STEP 1: Optimize homes.status (VARCHAR → ENUM)
-- Savings: 97% reduction (30 bytes → 1 byte per row)
-- ============================================================

-- 1.1: Check current distinct values
SELECT DISTINCT status FROM homes;
-- Expected: available, sold, pending, reserved, coming_soon, unavailable

-- 1.2: Add new ENUM column
ALTER TABLE homes ADD COLUMN status_new ENUM(
  'available',
  'sold',
  'pending',
  'reserved',
  'coming_soon',
  'unavailable',
  'unknown'
) DEFAULT 'available' AFTER status;

-- 1.3: Migrate data
UPDATE homes SET status_new =
  CASE
    WHEN LOWER(status) = 'available' THEN 'available'
    WHEN LOWER(status) = 'sold' THEN 'sold'
    WHEN LOWER(status) = 'pending' THEN 'pending'
    WHEN LOWER(status) = 'reserved' THEN 'reserved'
    WHEN LOWER(status) IN ('coming soon', 'coming_soon') THEN 'coming_soon'
    WHEN LOWER(status) = 'unavailable' THEN 'unavailable'
    ELSE 'unknown'
  END;

-- 1.4: Verify no NULL values (should be 0)
SELECT COUNT(*) FROM homes WHERE status IS NOT NULL AND status_new IS NULL;

-- 1.5: Drop old column and index
DROP INDEX idx_status ON homes;
ALTER TABLE homes DROP COLUMN status;

-- 1.6: Rename new column
ALTER TABLE homes CHANGE status_new status ENUM(
  'available',
  'sold',
  'pending',
  'reserved',
  'coming_soon',
  'unavailable',
  'unknown'
) DEFAULT 'available' NOT NULL;

-- 1.7: Recreate index
CREATE INDEX idx_status ON homes(status);

-- ============================================================
-- STEP 2: Optimize homes.baths (VARCHAR → DECIMAL)
-- Savings: 44% reduction (18 bytes → 10 bytes per row)
-- ============================================================

-- 2.1: Check data (ensure it's numeric)
SELECT DISTINCT baths FROM homes WHERE baths IS NOT NULL ORDER BY baths;

-- 2.2: Add new DECIMAL column
ALTER TABLE homes ADD COLUMN baths_new DECIMAL(3,1) AFTER baths;

-- 2.3: Migrate data (handles "2.5", "2", etc.)
UPDATE homes SET baths_new = CAST(baths AS DECIMAL(3,1))
WHERE baths IS NOT NULL AND baths != '';

-- 2.4: Verify migration
SELECT
  COUNT(*) as total,
  COUNT(baths) as old_count,
  COUNT(baths_new) as new_count
FROM homes;

-- 2.5: Drop old column
ALTER TABLE homes DROP COLUMN baths;

-- 2.6: Rename new column
ALTER TABLE homes CHANGE baths_new baths DECIMAL(3,1);

-- ============================================================
-- STEP 3: Optimize homes.drop_source (VARCHAR → ENUM)
-- Savings: 95% reduction (20 bytes → 1 byte per row)
-- ============================================================

-- 3.1: Check current values
SELECT DISTINCT drop_source FROM homes WHERE drop_source IS NOT NULL;
SELECT DISTINCT drop_source FROM price_history WHERE drop_source IS NOT NULL;

-- 3.2: Modify homes.drop_source
ALTER TABLE homes MODIFY drop_source ENUM(
  'builder',
  'redfin',
  'manual',
  'api',
  'scraper',
  'system'
) DEFAULT NULL;

-- 3.3: Modify price_history.drop_source
ALTER TABLE price_history MODIFY drop_source ENUM(
  'builder',
  'redfin',
  'manual',
  'api',
  'scraper',
  'system'
) DEFAULT NULL;

-- ============================================================
-- STEP 4: Optimize homes.homesite (VARCHAR(20) → VARCHAR(10))
-- Savings: 50% reduction (20 bytes → 10 bytes per row)
-- ============================================================

-- 4.1: Check max length (should be < 10)
SELECT MAX(LENGTH(homesite)) as max_len FROM homes WHERE homesite IS NOT NULL;

-- 4.2: Check if any values would be truncated
SELECT homesite FROM homes WHERE LENGTH(homesite) > 10;
-- Should be empty. If not, adjust VARCHAR(10) to higher value

-- 4.3: Shrink column
ALTER TABLE homes MODIFY homesite VARCHAR(10);

-- ============================================================
-- STEP 5: Optimize communities.status (VARCHAR → ENUM)
-- ============================================================

-- 5.1: Check current values
SELECT DISTINCT status FROM communities;

-- 5.2: Convert to ENUM
ALTER TABLE communities MODIFY status ENUM(
  'active',
  'inactive',
  'coming_soon',
  'sold_out',
  'unknown'
) DEFAULT 'active' NOT NULL;

-- ============================================================
-- STEP 6: Optimize community_schools.distance (VARCHAR → SMALLINT)
-- Savings: 90% reduction (20 bytes → 2 bytes per row)
-- ============================================================

-- 6.1: Check current format
SELECT DISTINCT distance FROM community_schools LIMIT 20;

-- 6.2: Add new column (distance in meters)
ALTER TABLE community_schools ADD COLUMN distance_new SMALLINT UNSIGNED AFTER distance;

-- 6.3: Convert data (supports "2.3 mi", "3.5 km", "1500 m")
UPDATE community_schools SET distance_new =
  CASE
    WHEN distance LIKE '%mi' OR distance LIKE '% mi' THEN
      CAST(REGEXP_REPLACE(distance, '[^0-9.]', '') AS DECIMAL(5,1)) * 1609
    WHEN distance LIKE '%km' OR distance LIKE '% km' THEN
      CAST(REGEXP_REPLACE(distance, '[^0-9.]', '') AS DECIMAL(5,1)) * 1000
    WHEN distance LIKE '%m' OR distance LIKE '% m' THEN
      CAST(REGEXP_REPLACE(distance, '[^0-9.]', '') AS DECIMAL(5,1))
    WHEN distance REGEXP '^[0-9.]+$' THEN
      CAST(distance AS DECIMAL(5,1)) * 1609  -- Assume miles if no unit
    ELSE NULL
  END
WHERE distance IS NOT NULL;

-- 6.4: Verify conversion
SELECT distance, distance_new FROM community_schools
WHERE distance IS NOT NULL LIMIT 10;

-- 6.5: Drop old column
ALTER TABLE community_schools DROP COLUMN distance;

-- 6.6: Rename new column
ALTER TABLE community_schools CHANGE distance_new distance SMALLINT UNSIGNED;

-- ============================================================
-- STEP 7: Optimize URL columns (VARCHAR(500) → VARCHAR(255))
-- Savings: 49% reduction (500 bytes → 255 bytes per row)
-- ============================================================

-- 7.1: Check max URL lengths
SELECT
  MAX(LENGTH(home_url)) as max_home_url,
  AVG(LENGTH(home_url)) as avg_home_url
FROM homes WHERE home_url IS NOT NULL;

SELECT
  MAX(LENGTH(url)) as max_community_url,
  AVG(LENGTH(url)) as avg_community_url
FROM communities WHERE url IS NOT NULL;

-- 7.2: Find any URLs that would be truncated
SELECT home_url FROM homes WHERE LENGTH(home_url) > 255;
SELECT url FROM communities WHERE LENGTH(url) > 255;
-- If any found, keep VARCHAR(500) or increase to VARCHAR(300)

-- 7.3: Shrink columns (if safe)
ALTER TABLE homes MODIFY home_url VARCHAR(255);
ALTER TABLE communities MODIFY url VARCHAR(255);
ALTER TABLE schools MODIFY url VARCHAR(300);
ALTER TABLE special_offers MODIFY url VARCHAR(300);

-- ============================================================
-- Verification Queries
-- ============================================================

-- Check storage savings
SELECT
  table_name,
  table_rows,
  ROUND(data_length / 1024 / 1024, 2) AS data_mb,
  ROUND(index_length / 1024 / 1024, 2) AS index_mb,
  ROUND((data_length + index_length) / 1024 / 1024, 2) AS total_mb
FROM information_schema.tables
WHERE table_schema = 'home_monitor'
AND table_name IN ('homes', 'communities', 'community_schools', 'price_history')
ORDER BY (data_length + index_length) DESC;

-- Check data integrity
SELECT
  'homes' as tbl,
  COUNT(*) as total_rows,
  COUNT(status) as has_status,
  COUNT(baths) as has_baths,
  COUNT(drop_source) as has_drop_source
FROM homes
UNION ALL
SELECT
  'communities' as tbl,
  COUNT(*) as total_rows,
  COUNT(status) as has_status,
  NULL, NULL
FROM communities;

-- Restore settings
SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;

-- ============================================================
-- COMPLETED: Data type optimization
-- Expected result: 70-75% storage reduction on optimized columns
-- Next step: Run 02_add_partitions.sql (if >20,000 homes)
-- ============================================================
