-- ============================================================
-- home-monitor — Seed Data
-- 4 cities, 6 builders, 32 communities, 2 users
-- INSERT IGNORE for idempotent re-runs
-- ============================================================
SET NAMES utf8mb4;

-- ── Cities ───────────────────────────────────────────────────
INSERT IGNORE INTO cities (name, state, county, zip_codes, schools_url) VALUES
    ('Tracy',          'CA', 'San Joaquin', '["95376","95377"]',          'https://www.greatschools.org/california/tracy/'),
    ('Mountain House', 'CA', 'San Joaquin', '["95391"]',                  'https://www.greatschools.org/california/mountain-house/'),
    ('Dublin',         'CA', 'Alameda',     '["94568"]',                  'https://www.greatschools.org/california/dublin/'),
    ('Roseville',      'CA', 'Placer',      '["95747","95678","95661"]',  'https://www.greatschools.org/california/roseville/');

-- ── Builders ─────────────────────────────────────────────────
INSERT IGNORE INTO builders (name, color_hex, base_url) VALUES
    ('Lennar',                 '#1D4ED8', 'https://www.lennar.com'),
    ('KB Home',                '#DC2626', 'https://www.kbhome.com'),
    ('Toll Brothers',          '#6D28D9', 'https://www.tollbrothers.com'),
    ('Taylor Morrison',        '#059669', 'https://www.taylormorrison.com'),
    ('JMC Homes',              '#7C2D12', 'https://www.jmchomes.com'),
    ('Brookfield Residential', '#374151', 'https://www.brookfieldresidential.com');

-- ── Helper: get IDs ──────────────────────────────────────────
-- Using subselects for readability

-- ── Communities: Tracy ────────────────────────────────────────
INSERT IGNORE INTO communities (builder_id, city_id, name, slug, url, is_55_plus, builder_meta) VALUES
    ((SELECT id FROM builders WHERE name='Lennar'),
     (SELECT id FROM cities WHERE name='Tracy'),
     'Tracy Hills', 'tracy-hills',
     'https://www.lennar.com/new-homes/california/san-francisco-bay-area/tracy/tracy-hills',
     0, NULL),
    ((SELECT id FROM builders WHERE name='Toll Brothers'),
     (SELECT id FROM cities WHERE name='Tracy'),
     'Regency at Tracy Lakes', 'regency-at-tracy-lakes',
     'https://www.tollbrothers.com/luxury-homes-for-sale/California/Regency-at-Tracy-Lakes',
     1, NULL);

-- ── Communities: Mountain House ──────────────────────────────
INSERT IGNORE INTO communities (builder_id, city_id, name, slug, url, is_55_plus, builder_meta) VALUES
    ((SELECT id FROM builders WHERE name='Lennar'),
     (SELECT id FROM cities WHERE name='Mountain House'),
     'Creekside', 'creekside',
     'https://www.lennar.com/new-homes/california/san-francisco-bay-area/mountain-house/creekside',
     0, NULL),
    ((SELECT id FROM builders WHERE name='Lennar'),
     (SELECT id FROM cities WHERE name='Mountain House'),
     'Lakeshore', 'lakeshore',
     'https://www.lennar.com/new-homes/california/san-francisco-bay-area/mountain-house/lakeshore',
     0, NULL),
    ((SELECT id FROM builders WHERE name='KB Home'),
     (SELECT id FROM cities WHERE name='Mountain House'),
     'Altamira at College Park', 'altamira-at-college-park',
     'https://www.kbhome.com/new-homes-central-valley/altamira-at-college-park',
     0, NULL);

-- ── Communities: Dublin ──────────────────────────────────────
INSERT IGNORE INTO communities (builder_id, city_id, name, slug, url, is_55_plus, status, builder_meta) VALUES
    ((SELECT id FROM builders WHERE name='Lennar'),
     (SELECT id FROM cities WHERE name='Dublin'),
     'Iron Horse Village', 'iron-horse-village',
     'https://www.lennar.com/new-homes/california/san-francisco-bay-area/san-ramon/iron-horse-village',
     0, 'coming_soon', NULL),
    ((SELECT id FROM builders WHERE name='Brookfield Residential'),
     (SELECT id FROM cities WHERE name='Dublin'),
     'Boulevard', 'boulevard',
     'https://www.boulevarddublin.com',
     0, 'coming_soon', NULL),
    ((SELECT id FROM builders WHERE name='Taylor Morrison'),
     (SELECT id FROM cities WHERE name='Dublin'),
     'Boulevard at Dublin', 'boulevard-at-dublin',
     'https://www.taylormorrison.com/ca/bay-area/dublin/boulevard',
     0, 'coming_soon', '{"scrape_mode": "coming_soon"}');

-- ── Communities: Roseville — Lennar ──────────────────────────
INSERT IGNORE INTO communities (builder_id, city_id, name, slug, url, is_55_plus, builder_meta) VALUES
    ((SELECT id FROM builders WHERE name='Lennar'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Centera', 'centera',
     'https://www.lennar.com/new-homes/california/sacramento/roseville/centera', 0, NULL),
    ((SELECT id FROM builders WHERE name='Lennar'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Windham II', 'windham-ii',
     'https://www.lennar.com/new-homes/california/sacramento/roseville/windham-ii', 0, NULL),
    ((SELECT id FROM builders WHERE name='Lennar'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'The Links at Sierra View', 'the-links-at-sierra-view',
     'https://www.lennar.com/new-homes/california/sacramento/roseville/the-links-at-sierra-view', 0, NULL),
    ((SELECT id FROM builders WHERE name='Lennar'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Heritage | Placer Vineyards | Active Adult', 'heritage-placer-vineyards-active-adult',
     'https://www.lennar.com/new-homes/california/sacramento/roseville/heritage-placer-vineyards--active-adult', 1, NULL);

-- ── Communities: Roseville — KB Home ─────────────────────────
INSERT IGNORE INTO communities (builder_id, city_id, name, slug, url, is_55_plus, builder_meta) VALUES
    ((SELECT id FROM builders WHERE name='KB Home'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Brighton At Placer One', 'brighton-at-placer-one',
     'https://www.kbhome.com/new-homes-sacramento/brighton-at-placer-one', 0, NULL),
    ((SELECT id FROM builders WHERE name='KB Home'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Bristol At Placer One', 'bristol-at-placer-one',
     'https://www.kbhome.com/new-homes-sacramento/bristol-at-placer-one', 0, NULL),
    ((SELECT id FROM builders WHERE name='KB Home'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Cambridge At Placer One', 'cambridge-at-placer-one',
     'https://www.kbhome.com/new-homes-sacramento/cambridge-at-placer-one', 0, NULL),
    ((SELECT id FROM builders WHERE name='KB Home'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Canterbury At Placer One', 'canterbury-at-placer-one',
     'https://www.kbhome.com/new-homes-sacramento/canterbury-at-placer-one', 0, NULL),
    ((SELECT id FROM builders WHERE name='KB Home'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Ashford At Placer One', 'ashford-at-placer-one',
     'https://www.kbhome.com/new-homes-sacramento/ashford-at-placer-one', 0, NULL);

-- ── Communities: Roseville — Taylor Morrison ─────────────────
INSERT IGNORE INTO communities (builder_id, city_id, name, slug, url, is_55_plus, status, builder_meta) VALUES
    ((SELECT id FROM builders WHERE name='Taylor Morrison'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Orion at Solaire', 'orion-at-solaire',
     'https://www.taylormorrison.com/ca/sacramento/roseville/orion-at-solaire',
     0, 'active', '{"scrape_mode": "html"}'),
    ((SELECT id FROM builders WHERE name='Taylor Morrison'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Mariposa at Winding Creek', 'mariposa-at-winding-creek',
     'https://www.taylormorrison.com/ca/sacramento/roseville/mariposa-at-winding-creek',
     0, 'active', '{"scrape_mode": "html"}'),
    ((SELECT id FROM builders WHERE name='Taylor Morrison'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Oakhaven at Winding Creek', 'oakhaven-at-winding-creek',
     'https://www.taylormorrison.com/ca/sacramento/roseville/oakhaven-at-winding-creek',
     0, 'active', '{"scrape_mode": "html"}'),
    ((SELECT id FROM builders WHERE name='Taylor Morrison'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Esplanade at Ross Creek', 'esplanade-at-ross-creek',
     'https://www.taylormorrison.com/ca/sacramento/roseville/esplanade-at-ross-creek',
     0, 'active', '{"scrape_mode": "firecrawl"}'),
    ((SELECT id FROM builders WHERE name='Taylor Morrison'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Hidden Oaks', 'hidden-oaks',
     'https://www.taylormorrison.com/ca/sacramento/roseville/hidden-oaks',
     0, 'coming_soon', '{"scrape_mode": "coming_soon", "school_proxy": "Mariposa at Winding Creek"}'),
    ((SELECT id FROM builders WHERE name='Taylor Morrison'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Aria at Placer One', 'aria-at-placer-one',
     'https://www.taylormorrison.com/ca/sacramento/roseville/aria-at-placer-one',
     0, 'coming_soon', '{"scrape_mode": "coming_soon", "school_proxy": "Orion at Solaire"}'),
    ((SELECT id FROM builders WHERE name='Taylor Morrison'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Sonata at Placer One', 'sonata-at-placer-one',
     'https://www.taylormorrison.com/ca/sacramento/roseville/sonata-at-placer-one',
     0, 'coming_soon', '{"scrape_mode": "coming_soon", "school_proxy": "Orion at Solaire"}');

-- ── Communities: Roseville — JMC Homes ───────────────────────
INSERT IGNORE INTO communities (builder_id, city_id, name, slug, url, is_55_plus, builder_meta) VALUES
    ((SELECT id FROM builders WHERE name='JMC Homes'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Excelsior Village at Sierra Vista', 'excelsior-village-at-sierra-vista',
     'https://www.jmchomes.com/homes/roseville/excelsior-village-at-sierra-vista', 0,
     '{"school_proxies": ["Diamond Creek Elementary", "Robert C. Cooley Middle School", "Roseville High School"]}'),
    ((SELECT id FROM builders WHERE name='JMC Homes'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Highline Village at Sierra Vista', 'highline-village-at-sierra-vista',
     'https://www.jmchomes.com/homes/roseville/highline-village-at-sierra-vista', 0,
     '{"school_proxies": ["Diamond Creek Elementary", "Robert C. Cooley Middle School", "Roseville High School"]}'),
    ((SELECT id FROM builders WHERE name='JMC Homes'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Overland Village at Sierra Vista', 'overland-village-at-sierra-vista',
     'https://www.jmchomes.com/homes/roseville/overland-village-at-sierra-vista', 0,
     '{"school_proxies": ["Diamond Creek Elementary", "Robert C. Cooley Middle School", "Roseville High School"]}'),
    ((SELECT id FROM builders WHERE name='JMC Homes'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Sagebrook at Fiddyment Farm', 'sagebrook-at-fiddyment-farm',
     'https://www.jmchomes.com/homes/roseville/sagebrook-at-fiddyment-farm', 0,
     '{"school_proxies": ["Diamond Creek Elementary", "Robert C. Cooley Middle School", "Roseville High School"]}'),
    ((SELECT id FROM builders WHERE name='JMC Homes'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Sentinel Village at Sierra Vista', 'sentinel-village-at-sierra-vista',
     'https://www.jmchomes.com/homes/roseville/sentinel-village-at-sierra-vista', 0,
     '{"school_proxies": ["Diamond Creek Elementary", "Robert C. Cooley Middle School", "Roseville High School"]}'),
    ((SELECT id FROM builders WHERE name='JMC Homes'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Bridgefield at Placer One', 'bridgefield-at-placer-one',
     'https://www.jmchomes.com/homes/roseville/bridgefield-at-placer-one', 0,
     '{"school_proxies": ["Diamond Creek Elementary", "Robert C. Cooley Middle School", "Roseville High School"]}'),
    ((SELECT id FROM builders WHERE name='JMC Homes'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Deerfield at Placer One', 'deerfield-at-placer-one',
     'https://www.jmchomes.com/homes/roseville/deerfield-at-placer-one', 0,
     '{"school_proxies": ["Diamond Creek Elementary", "Robert C. Cooley Middle School", "Roseville High School"]}'),
    ((SELECT id FROM builders WHERE name='JMC Homes'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Northfield at Placer One', 'northfield-at-placer-one',
     'https://www.jmchomes.com/homes/roseville/northfield-at-placer-one', 0,
     '{"school_proxies": ["Diamond Creek Elementary", "Robert C. Cooley Middle School", "Roseville High School"]}'),
    ((SELECT id FROM builders WHERE name='JMC Homes'),
     (SELECT id FROM cities WHERE name='Roseville'),
     'Parkfield at Placer One', 'parkfield-at-placer-one',
     'https://www.jmchomes.com/homes/roseville/parkfield-at-placer-one', 0,
     '{"school_proxies": ["Diamond Creek Elementary", "Robert C. Cooley Middle School", "Roseville High School"]}');

-- ── Users ────────────────────────────────────────────────────
INSERT IGNORE INTO users (name, email) VALUES
    ('Deepesh', 'deepeshbhatia21@gmail.com'),
    ('Preeti',  'preetimehindru9@gmail.com');

-- ── User Preferences ─────────────────────────────────────────
INSERT IGNORE INTO user_preferences (user_id, min_beds, min_baths, max_price, min_sqft,
    exclude_55_plus, preferred_neighborhoods, preferred_builders, scoring_weights,
    alert_frequency, alert_price_drops, alert_new_listings, alert_coming_soon) VALUES
    ((SELECT id FROM users WHERE email='deepeshbhatia21@gmail.com'),
     4, 2.0, 1100000, 1800, 1,
     '["Tracy Hills","Lakeshore","Creekside","Boulevard"]',
     '["Lennar","KB Home","Taylor Morrison"]',
     '{"value_ppsf":40,"price_drop":30,"availability":20,"sqft_bonus":5,"hotw":5}',
     'daily', 1, 1, 1),
    ((SELECT id FROM users WHERE email='preetimehindru9@gmail.com'),
     4, 2.0, NULL, NULL, 1,
     '["Placer One","Winding Creek","Solaire","West Roseville"]',
     '["Taylor Morrison","KB Home","Lennar","JMC Homes"]',
     '{"value_ppsf":40,"price_drop":30,"availability":20,"sqft_bonus":5,"hotw":5}',
     'daily', 1, 1, 1);

-- ── User City Subscriptions ──────────────────────────────────
-- Deepesh: Tracy + Mountain House + Dublin
INSERT IGNORE INTO user_cities (user_id, city_id) VALUES
    ((SELECT id FROM users WHERE email='deepeshbhatia21@gmail.com'),
     (SELECT id FROM cities WHERE name='Tracy')),
    ((SELECT id FROM users WHERE email='deepeshbhatia21@gmail.com'),
     (SELECT id FROM cities WHERE name='Mountain House')),
    ((SELECT id FROM users WHERE email='deepeshbhatia21@gmail.com'),
     (SELECT id FROM cities WHERE name='Dublin'));

-- Preeti: Roseville
INSERT IGNORE INTO user_cities (user_id, city_id) VALUES
    ((SELECT id FROM users WHERE email='preetimehindru9@gmail.com'),
     (SELECT id FROM cities WHERE name='Roseville'));
