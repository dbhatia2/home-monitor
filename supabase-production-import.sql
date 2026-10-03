-- Drop all existing tables
DROP TABLE IF EXISTS homes CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS builders CASCADE;

-- Builders table
CREATE TABLE builders (
  id SMALLSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  color_hex CHAR(7),
  base_url VARCHAR(200),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Cities table
CREATE TABLE cities (
  id SMALLSERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  state CHAR(2) NOT NULL,
  county VARCHAR(50),
  zip_codes TEXT,
  schools_url VARCHAR(200),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, state)
);

-- Communities table
CREATE TABLE communities (
  id SERIAL PRIMARY KEY,
  builder_id SMALLINT REFERENCES builders(id),
  city_id SMALLINT REFERENCES cities(id),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120),
  url VARCHAR(300),
  status VARCHAR(20),
  active BOOLEAN NOT NULL DEFAULT true,
  is_55_plus BOOLEAN NOT NULL DEFAULT false,
  meta TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Homes table
CREATE TABLE homes (
  id SERIAL PRIMARY KEY,
  community_id INTEGER REFERENCES communities(id),
  address VARCHAR(200),
  home_url VARCHAR(500),
  beds SMALLINT,
  baths DECIMAL(3,1),
  sqft INTEGER,
  plan_name VARCHAR(100),
  homesite VARCHAR(50),
  price INTEGER,
  was_price INTEGER,
  price_per_sqft INTEGER,
  status VARCHAR(30) DEFAULT 'AVAILABLE',
  is_hotw BOOLEAN DEFAULT false,
  price_drop BOOLEAN DEFAULT false,
  price_drop_amt INTEGER,
  prev_price INTEGER,
  new_listing BOOLEAN DEFAULT false,
  drop_source VARCHAR(20),
  spotlight_features TEXT,
  builder_meta TEXT,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_homes_community ON homes(community_id);
CREATE INDEX idx_homes_status ON homes(status);
CREATE INDEX idx_homes_price ON homes(price);
CREATE INDEX idx_communities_builder ON communities(builder_id);
CREATE INDEX idx_communities_city ON communities(city_id);
