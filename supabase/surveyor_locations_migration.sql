-- Live field presence for surveyors on the input map.
CREATE TABLE IF NOT EXISTS public.surveyor_locations (
    user_id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    role_label TEXT,
    team TEXT DEFAULT 'LAINNYA',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveyor_locations_updated_at
    ON public.surveyor_locations (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_surveyor_locations_lat_lng
    ON public.surveyor_locations (latitude, longitude);

ALTER TABLE public.surveyor_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on surveyor_locations"
    ON public.surveyor_locations FOR SELECT USING (true);

CREATE POLICY "Allow public insert on surveyor_locations"
    ON public.surveyor_locations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on surveyor_locations"
    ON public.surveyor_locations FOR UPDATE USING (true);
