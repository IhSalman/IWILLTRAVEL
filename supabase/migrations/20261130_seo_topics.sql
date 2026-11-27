-- SEO topic queue for daily, auto-published itinerary guides (/api/cron/seo-guides).
-- One row per "N days in <destination>" search phrase.

CREATE TABLE IF NOT EXISTS public.seo_topics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination     TEXT NOT NULL,                       -- "Kyoto, Japan"
    destination_key TEXT GENERATED ALWAYS AS (lower(destination)) STORED,
    days            INT  NOT NULL CHECK (days BETWEEN 1 AND 14),
    keyword         TEXT NOT NULL,                       -- "3 days in Kyoto itinerary"
    priority        INT  NOT NULL DEFAULT 50,            -- higher = sooner
    source          TEXT NOT NULL DEFAULT 'seed',        -- seed | demand | manual
    status          TEXT NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'published', 'draft', 'failed')),
    attempts        INT  NOT NULL DEFAULT 0,
    blog_id         UUID,
    last_error      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (destination_key, days)
);

CREATE INDEX IF NOT EXISTS seo_topics_queue_idx ON public.seo_topics (status, priority DESC, created_at);
ALTER TABLE public.seo_topics ENABLE ROW LEVEL SECURITY; -- server-only

-- Guides record when they were last refreshed (sitemap lastModified, "Verified on").
ALTER TABLE IF EXISTS public.blogs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ── Seed topics ──────────────────────────────────────────────────────────────
-- Priority: 3-day plans (most searched) first, then 5-day, weekend, 7-day.
WITH cities(destination, lengths, boost) AS (
    VALUES
        -- curated destinations (src/data/destinations.ts)
        ('Kyoto, Japan',               ARRAY[3,5,2,7], 10),
        ('Tokyo, Japan',               ARRAY[3,5,2,7], 10),
        ('Paris, France',              ARRAY[3,5,2,7], 10),
        ('Rome, Italy',                ARRAY[3,5,2,7], 10),
        ('Barcelona, Spain',           ARRAY[3,5,2,7], 10),
        ('Lisbon, Portugal',           ARRAY[3,5,2,7], 10),
        ('New York City, USA',         ARRAY[3,5,2,7], 10),
        ('Bali, Indonesia',            ARRAY[3,5,7],   10),
        ('Prague, Czechia',            ARRAY[3,2,5],   10),
        ('Dubai, UAE',                 ARRAY[3,2,5],   10),
        ('Cape Town, South Africa',    ARRAY[3,5,7],   10),
        ('Sydney, Australia',          ARRAY[3,5,7],   10),
        ('Chiang Mai, Thailand',       ARRAY[3,5],     10),
        ('Medellín, Colombia',         ARRAY[3,5],     10),
        ('Rio de Janeiro, Brazil',     ARRAY[3,5],     10),
        ('Santorini, Greece',          ARRAY[3,2],     10),
        ('Banff, Canada',              ARRAY[3,2],     10),
        ('Machu Picchu, Peru',         ARRAY[2,3],     10),
        -- other high-demand cities
        ('London, United Kingdom',     ARRAY[3,5,2],   5),
        ('Amsterdam, Netherlands',     ARRAY[3,2],     5),
        ('Istanbul, Turkey',           ARRAY[3,5],     5),
        ('Bangkok, Thailand',          ARRAY[3,5],     5),
        ('Singapore',                  ARRAY[3,2],     5),
        ('Seoul, South Korea',         ARRAY[3,5],     5),
        ('Mexico City, Mexico',        ARRAY[3,5],     5),
        ('Marrakech, Morocco',         ARRAY[3,2],     5),
        ('Reykjavík, Iceland',         ARRAY[3,5],     5),
        ('Vienna, Austria',            ARRAY[3,2],     5),
        ('Budapest, Hungary',          ARRAY[3,2],     5),
        ('Berlin, Germany',            ARRAY[3,2],     5),
        ('Florence, Italy',            ARRAY[3,2],     5),
        ('Venice, Italy',              ARRAY[2,3],     5),
        ('Edinburgh, United Kingdom',  ARRAY[3,2],     5),
        ('Hanoi, Vietnam',             ARRAY[3,5],     5),
        ('Copenhagen, Denmark',        ARRAY[3,2],     5),
        ('Helsinki, Finland',          ARRAY[3,2],     5),
        ('Kuopio, Finland',            ARRAY[2,3],     5)
)
INSERT INTO public.seo_topics (destination, days, keyword, priority, source)
SELECT
    c.destination,
    d.days,
    CASE WHEN d.days = 2
         THEN 'weekend in ' || split_part(c.destination, ',', 1) || ' itinerary'
         ELSE d.days || ' days in ' || split_part(c.destination, ',', 1) || ' itinerary' END,
    c.boost + CASE d.days WHEN 3 THEN 60 WHEN 5 THEN 50 WHEN 2 THEN 45 ELSE 40 END,
    'seed'
FROM cities c
CROSS JOIN LATERAL unnest(c.lengths) AS d(days)
ON CONFLICT (destination_key, days) DO NOTHING;
