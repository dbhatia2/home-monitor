-- ============================================================
-- home-monitor — Complete PostgreSQL Schema (13 tables)
-- Compatible with local PostgreSQL and Supabase
-- ============================================================

-- ── cities ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cities (
    id          SMALLSERIAL  PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL,
    state       CHAR(2)      NOT NULL,
    county      VARCHAR(50),
    zip_codes   JSONB,
    schools_url VARCHAR(300),
    active      BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (name, state)
);

-- ── builders ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS builders (
    id         SMALLSERIAL  PRIMARY KEY,
    name       VARCHAR(50)  NOT NULL UNIQUE,
    color_hex  CHAR(7),
    base_url   VARCHAR(200),
    active     BOOLEAN      NOT NULL DEFAULT true,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── communities ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communities (
    id              SERIAL       PRIMARY KEY,
    builder_id      SMALLINT     NOT NULL,
    city_id         SMALLINT     NOT NULL,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100),
    url             VARCHAR(300),
    status          VARCHAR(20)  NOT NULL DEFAULT 'active',
    community_live  BOOLEAN      NOT NULL DEFAULT true,
    is_55_plus      BOOLEAN      NOT NULL DEFAULT false,
    builder_meta    JSONB,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    FOREIGN KEY (builder_id) REFERENCES builders(id),
    FOREIGN KEY (city_id)    REFERENCES cities(id),
    UNIQUE (builder_id, city_id, name)
);

CREATE INDEX IF NOT EXISTS idx_communities_builder ON communities(builder_id);
CREATE INDEX IF NOT EXISTS idx_communities_city ON communities(city_id);

-- ── homes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS homes (
    id                 BIGSERIAL    PRIMARY KEY,
    community_id       INT          NOT NULL,
    address            VARCHAR(200) NOT NULL,
    home_url           VARCHAR(500),
    beds               SMALLINT,
    baths              VARCHAR(20),
    sqft               INT,
    plan_name          VARCHAR(100),
    homesite           VARCHAR(20),
    price              INT          NOT NULL,
    was_price          INT,
    price_per_sqft     INT,
    status             VARCHAR(30)  NOT NULL,
    is_hotw            BOOLEAN      NOT NULL DEFAULT false,
    price_drop         BOOLEAN      NOT NULL DEFAULT false,
    price_drop_amt     INT          NOT NULL DEFAULT 0,
    drop_source        VARCHAR(20),
    prev_price         INT,
    new_listing        BOOLEAN      NOT NULL DEFAULT false,
    spotlight_features JSONB,
    builder_meta       JSONB,
    first_seen_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    last_seen_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    FOREIGN KEY (community_id) REFERENCES communities(id),
    UNIQUE (community_id, address)
);

CREATE INDEX IF NOT EXISTS idx_homes_community ON homes(community_id);
CREATE INDEX IF NOT EXISTS idx_homes_status ON homes(status);
CREATE INDEX IF NOT EXISTS idx_homes_price ON homes(price);
CREATE INDEX IF NOT EXISTS idx_homes_beds ON homes(beds);
CREATE INDEX IF NOT EXISTS idx_homes_last_seen ON homes(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_homes_price_drop ON homes(price_drop);

-- ── price_history ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_history (
    id          BIGSERIAL    PRIMARY KEY,
    home_id     BIGINT       NOT NULL,
    old_price   INT,
    new_price   INT          NOT NULL,
    drop_amt    INT,
    drop_pct    DECIMAL(5,2),
    drop_source VARCHAR(20),
    changed_at  TIMESTAMP    NOT NULL,
    FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_price_history_home ON price_history(home_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed ON price_history(changed_at);

-- ── schools ──────────────────────────────────────────────────
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

-- ── community_schools ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_schools (
    community_id INT         NOT NULL,
    school_id    INT         NOT NULL,
    distance     VARCHAR(20),
    approximate  BOOLEAN     NOT NULL DEFAULT false,
    PRIMARY KEY (community_id, school_id),
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id)    REFERENCES schools(id)
);

-- ── snapshots ────────────────────────────────────────────────
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

-- ── special_offers ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS special_offers (
    id          SERIAL       PRIMARY KEY,
    builder_id  SMALLINT     NOT NULL,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    valid_until DATE,
    url         VARCHAR(500),
    active      BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    FOREIGN KEY (builder_id) REFERENCES builders(id)
);

-- ── offer_communities ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offer_communities (
    offer_id     INT NOT NULL,
    community_id INT NOT NULL,
    PRIMARY KEY (offer_id, community_id),
    FOREIGN KEY (offer_id)     REFERENCES special_offers(id) ON DELETE CASCADE,
    FOREIGN KEY (community_id) REFERENCES communities(id)    ON DELETE CASCADE
);

-- ── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL       PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(200) NOT NULL UNIQUE,
    is_active  BOOLEAN      NOT NULL DEFAULT true,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── user_preferences ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id                 INT PRIMARY KEY,
    min_beds                SMALLINT,
    min_baths               DECIMAL(3,1),
    max_price               INT,
    min_sqft                INT,
    exclude_55_plus         BOOLEAN DEFAULT true,
    preferred_neighborhoods JSONB,
    preferred_builders      JSONB,
    scoring_weights         JSONB,
    alert_frequency         VARCHAR(20) DEFAULT 'daily',
    alert_price_drops       BOOLEAN     DEFAULT true,
    alert_new_listings      BOOLEAN     DEFAULT true,
    alert_coming_soon       BOOLEAN     DEFAULT true,
    updated_at              TIMESTAMP   NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── user_cities ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_cities (
    user_id  INT      NOT NULL,
    city_id  SMALLINT NOT NULL,
    PRIMARY KEY (user_id, city_id),
    FOREIGN KEY (user_id)  REFERENCES users(id)   ON DELETE CASCADE,
    FOREIGN KEY (city_id)  REFERENCES cities(id)  ON DELETE CASCADE
);

-- ============================================================
-- COMPLETE SCHEMA - Ready for local dev and production
-- ============================================================
