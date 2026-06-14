-- ============================================================
-- home-monitor — MySQL Schema (13 tables)
-- ============================================================
SET NAMES utf8mb4;
SET foreign_key_checks = 0;

-- ── cities ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cities (
    id          SMALLINT     AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL,
    state       CHAR(2)      NOT NULL,
    county      VARCHAR(50),
    zip_codes   JSON,
    schools_url VARCHAR(300),
    active      TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_city_state (name, state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── builders ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS builders (
    id         SMALLINT     AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(50)  NOT NULL UNIQUE,
    color_hex  CHAR(7),
    base_url   VARCHAR(200),
    active     TINYINT(1)   NOT NULL DEFAULT 1,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── communities ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communities (
    id              INT          AUTO_INCREMENT PRIMARY KEY,
    builder_id      SMALLINT     NOT NULL,
    city_id         SMALLINT     NOT NULL,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100),
    url             VARCHAR(300),
    status          VARCHAR(20)  NOT NULL DEFAULT 'active',
    community_live  TINYINT(1)   NOT NULL DEFAULT 1,
    is_55_plus      TINYINT(1)   NOT NULL DEFAULT 0,
    builder_meta    JSON,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (builder_id) REFERENCES builders(id),
    FOREIGN KEY (city_id)    REFERENCES cities(id),
    UNIQUE KEY uk_builder_city_community (builder_id, city_id, name(80))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── homes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS homes (
    id                 BIGINT       AUTO_INCREMENT PRIMARY KEY,
    community_id       INT          NOT NULL,
    address            VARCHAR(200) NOT NULL,
    home_url           VARCHAR(500),
    beds               TINYINT,
    baths              VARCHAR(20),
    sqft               INT,
    plan_name          VARCHAR(100),
    homesite           VARCHAR(20),
    price              INT          NOT NULL,
    was_price          INT,
    price_per_sqft     INT,
    status             VARCHAR(30)  NOT NULL,
    is_hotw            TINYINT(1)   NOT NULL DEFAULT 0,
    price_drop         TINYINT(1)   NOT NULL DEFAULT 0,
    price_drop_amt     INT          NOT NULL DEFAULT 0,
    drop_source        VARCHAR(20),
    prev_price         INT,
    new_listing        TINYINT(1)   NOT NULL DEFAULT 0,
    spotlight_features JSON,
    builder_meta       JSON,
    first_seen_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (community_id) REFERENCES communities(id),
    INDEX idx_community  (community_id),
    INDEX idx_status     (status),
    INDEX idx_price      (price),
    INDEX idx_beds       (beds),
    INDEX idx_last_seen  (last_seen_at),
    INDEX idx_price_drop (price_drop),
    UNIQUE KEY uk_address_community (community_id, address(150))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── price_history ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_history (
    id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
    home_id     BIGINT       NOT NULL,
    old_price   INT,
    new_price   INT          NOT NULL,
    drop_amt    INT,
    drop_pct    DECIMAL(5,2),
    drop_source VARCHAR(20),
    changed_at  DATETIME     NOT NULL,
    FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE,
    INDEX idx_home_id    (home_id),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── schools ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
    id           INT          AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    grades       VARCHAR(20),
    type         VARCHAR(20),
    district     VARCHAR(150),
    rating_gs    TINYINT,
    rating_niche VARCHAR(5),
    url          VARCHAR(500),
    city_id      SMALLINT     NOT NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (city_id) REFERENCES cities(id),
    UNIQUE KEY uk_school_city (name(100), city_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── community_schools ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_schools (
    community_id INT NOT NULL,
    school_id    INT NOT NULL,
    distance     VARCHAR(20),
    approximate  TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (community_id, school_id),
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id)    REFERENCES schools(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── snapshots ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS snapshots (
    id           BIGINT       AUTO_INCREMENT PRIMARY KEY,
    run_at       DATETIME     NOT NULL,
    city_id      SMALLINT,
    homes_total  INT          NOT NULL DEFAULT 0,
    homes_active INT          NOT NULL DEFAULT 0,
    drops_count  INT          NOT NULL DEFAULT 0,
    new_listings INT          NOT NULL DEFAULT 0,
    duration_sec INT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'success',
    error_msg    TEXT,
    FOREIGN KEY (city_id) REFERENCES cities(id),
    INDEX idx_run_at (run_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── special_offers ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS special_offers (
    id          INT          AUTO_INCREMENT PRIMARY KEY,
    builder_id  SMALLINT     NOT NULL,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    valid_until DATE,
    url         VARCHAR(500),
    active      TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (builder_id) REFERENCES builders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── offer_communities ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offer_communities (
    offer_id     INT NOT NULL,
    community_id INT NOT NULL,
    PRIMARY KEY (offer_id, community_id),
    FOREIGN KEY (offer_id)     REFERENCES special_offers(id) ON DELETE CASCADE,
    FOREIGN KEY (community_id) REFERENCES communities(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id         INT          AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(200) NOT NULL UNIQUE,
    is_active  TINYINT(1)   NOT NULL DEFAULT 1,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── user_preferences ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id             INT PRIMARY KEY,
    min_beds            TINYINT,
    min_baths           DECIMAL(3,1),
    max_price           INT,
    min_sqft            INT,
    exclude_55_plus     TINYINT(1) DEFAULT 1,
    preferred_neighborhoods JSON,
    preferred_builders      JSON,
    scoring_weights         JSON,
    alert_frequency     VARCHAR(20) DEFAULT 'daily',
    alert_price_drops   TINYINT(1)  DEFAULT 1,
    alert_new_listings  TINYINT(1)  DEFAULT 1,
    alert_coming_soon   TINYINT(1)  DEFAULT 1,
    updated_at          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── user_cities ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_cities (
    user_id  INT      NOT NULL,
    city_id  SMALLINT NOT NULL,
    PRIMARY KEY (user_id, city_id),
    FOREIGN KEY (user_id) REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (city_id) REFERENCES cities(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET foreign_key_checks = 1;
