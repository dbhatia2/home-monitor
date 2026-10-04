-- Add missing tables for scraper to work with Supabase
-- PostgreSQL version

-- Add builder_meta column to communities (if missing)
ALTER TABLE communities ADD COLUMN IF NOT EXISTS builder_meta JSONB;

-- price_history table
CREATE TABLE IF NOT EXISTS price_history (
    id          BIGSERIAL PRIMARY KEY,
    home_id     BIGINT       NOT NULL,
    old_price   INT,
    new_price   INT          NOT NULL,
    drop_amt    INT,
    drop_pct    DECIMAL(5,2),
    drop_source VARCHAR(20),
    changed_at  TIMESTAMP    NOT NULL,
    FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_price_history_home_id ON price_history(home_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON price_history(changed_at);

-- schools table
CREATE TABLE IF NOT EXISTS schools (
    id           SERIAL       PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    grades       VARCHAR(20),
    type         VARCHAR(20),
    district     VARCHAR(150),
    rating_gs    SMALLINT,
    rating_niche VARCHAR(5),
    url          VARCHAR(500),
    city_id      SMALLINT     NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    FOREIGN KEY (city_id) REFERENCES cities(id),
    UNIQUE (name, city_id)
);

-- community_schools table
CREATE TABLE IF NOT EXISTS community_schools (
    community_id INT         NOT NULL,
    school_id    INT         NOT NULL,
    distance     VARCHAR(20),
    approximate  BOOLEAN     NOT NULL DEFAULT false,
    PRIMARY KEY (community_id, school_id),
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id)    REFERENCES schools(id)
);

-- snapshots table
CREATE TABLE IF NOT EXISTS snapshots (
    id           BIGSERIAL    PRIMARY KEY,
    run_at       TIMESTAMP    NOT NULL,
    city_id      SMALLINT,
    homes_total  INT          NOT NULL DEFAULT 0,
    homes_active INT          NOT NULL DEFAULT 0,
    drops_count  INT          NOT NULL DEFAULT 0,
    new_listings INT          NOT NULL DEFAULT 0,
    duration_sec INT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'success',
    error_msg    TEXT,
    FOREIGN KEY (city_id) REFERENCES cities(id)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_run_at ON snapshots(run_at);
