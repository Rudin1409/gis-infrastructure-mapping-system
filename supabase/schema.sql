-- =========================================================================
-- SKEMA DATABASE POSTGRESQL SUPABASE - GIS KOTA LUBUKLINGGAU
-- DISKOMINFOTIKSAN KOTA LUBUKLINGGAU
-- =========================================================================

-- 1. TABEL TIANG (POLES)
CREATE TABLE IF NOT EXISTS public.poles (
    id TEXT PRIMARY KEY,
    pole_code TEXT,
    pole_latitude DOUBLE PRECISION NOT NULL,
    pole_longitude DOUBLE PRECISION NOT NULL,
    device_latitude DOUBLE PRECISION,
    device_longitude DOUBLE PRECISION,
    gps_accuracy DOUBLE PRECISION,
    distance_from_device DOUBLE PRECISION,
    location_method TEXT DEFAULT 'GPS_DEVICE',
    provider_id TEXT NOT NULL,
    provider_name TEXT,
    pole_type TEXT DEFAULT 'BETON',
    condition TEXT DEFAULT 'GOOD',
    road TEXT NOT NULL,
    kelurahan TEXT NOT NULL,
    kecamatan TEXT NOT NULL,
    kota TEXT DEFAULT 'Kota Lubuklinggau',
    patokan_lokasi TEXT,
    sisi_jalan TEXT DEFAULT 'KIRI',
    height TEXT DEFAULT '7m',
    ownership_status TEXT DEFAULT 'SENDIRI',
    cable_installation_type TEXT DEFAULT 'UDARA',
    infrastructure_category TEXT DEFAULT 'FO_WIFI',
    pju_lamp_type TEXT DEFAULT 'TIDAK_ADA',
    pju_lamp_power TEXT,
    pju_lamp_condition TEXT DEFAULT 'TIDAK_ADA',
    has_kwh_meter BOOLEAN DEFAULT FALSE,
    has_network_cable BOOLEAN DEFAULT FALSE,
    is_tilted BOOLEAN DEFAULT FALSE,
    is_messy_cable BOOLEAN DEFAULT FALSE,
    is_low_cable BOOLEAN DEFAULT FALSE,
    is_hazardous BOOLEAN DEFAULT FALSE,
    is_corroded BOOLEAN DEFAULT FALSE,
    is_obstructing BOOLEAN DEFAULT FALSE,
    description TEXT,
    photo_file_id TEXT,
    photo_url TEXT,
    additional_photo_file_id TEXT,
    additional_photo_url TEXT,
    surveyor_id TEXT,
    surveyor_name TEXT,
    survey_date TEXT NOT NULL,
    survey_time TEXT,
    validation_status TEXT DEFAULT 'SUBMITTED',
    validation_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL PROVIDER / OPERATOR (PROVIDERS)
CREATE TABLE IF NOT EXISTS public.providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    status TEXT DEFAULT 'ACTIVE'
);

-- 3. TABEL SEGMEN KABEL JARINGAN (SEGMENTS)
CREATE TABLE IF NOT EXISTS public.segments (
    id TEXT PRIMARY KEY,
    segment_code TEXT,
    from_node_id TEXT NOT NULL,
    to_node_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    provider_name TEXT,
    network_type TEXT DEFAULT 'FIBER_OPTIC',
    installation_type TEXT DEFAULT 'AERIAL',
    estimated_distance DOUBLE PRECISION DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL AKUN PENGGUNA (USERS)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    agency TEXT,
    phone TEXT,
    status TEXT DEFAULT 'AKTIF',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL LOKASI AKTIF SURVEYOR DI LAPANGAN
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

-- 6. INDEX SPASIAL & PENCARIAN CEPAT
CREATE INDEX IF NOT EXISTS idx_poles_lat_lng ON public.poles (pole_latitude, pole_longitude);
CREATE INDEX IF NOT EXISTS idx_poles_kecamatan ON public.poles (kecamatan);
CREATE INDEX IF NOT EXISTS idx_poles_provider ON public.poles (provider_id);
CREATE INDEX IF NOT EXISTS idx_poles_condition ON public.poles (condition);
CREATE INDEX IF NOT EXISTS idx_poles_category ON public.poles (infrastructure_category);
CREATE INDEX IF NOT EXISTS idx_poles_cable_type ON public.poles (cable_installation_type);
CREATE INDEX IF NOT EXISTS idx_segments_nodes ON public.segments (from_node_id, to_node_id);
CREATE INDEX IF NOT EXISTS idx_segments_provider ON public.segments (provider_id);
CREATE INDEX IF NOT EXISTS idx_surveyor_locations_updated_at ON public.surveyor_locations (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_surveyor_locations_lat_lng ON public.surveyor_locations (latitude, longitude);

-- 7. AKTIFKAN ROW LEVEL SECURITY (RLS) DENGAN AKSES ANOM/PUBLIC READ & WRITE
ALTER TABLE public.poles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveyor_locations ENABLE ROW LEVEL SECURITY;

-- Izinkan akses penuh publik untuk aplikasi Web GIS & Surveyor
CREATE POLICY "Allow public read on poles" ON public.poles FOR SELECT USING (true);
CREATE POLICY "Allow public insert on poles" ON public.poles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on poles" ON public.poles FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on poles" ON public.poles FOR DELETE USING (true);

CREATE POLICY "Allow public read on providers" ON public.providers FOR SELECT USING (true);
CREATE POLICY "Allow public insert on providers" ON public.providers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on providers" ON public.providers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on providers" ON public.providers FOR DELETE USING (true);

CREATE POLICY "Allow public read on segments" ON public.segments FOR SELECT USING (true);
CREATE POLICY "Allow public insert on segments" ON public.segments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on segments" ON public.segments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on segments" ON public.segments FOR DELETE USING (true);

CREATE POLICY "Allow public read on users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public insert on users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on users" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on users" ON public.users FOR DELETE USING (true);

CREATE POLICY "Allow public read on surveyor_locations" ON public.surveyor_locations FOR SELECT USING (true);
CREATE POLICY "Allow public insert on surveyor_locations" ON public.surveyor_locations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on surveyor_locations" ON public.surveyor_locations FOR UPDATE USING (true);

-- 8. SEED DATA AKUN RESMI DISKOMINFOTIKSAN
INSERT INTO public.users (id, name, email, password, role, agency, phone, status)
VALUES
  ('USR-KOMINFO-ADMIN', 'Admin DISKOMINFOTIKSAN', 'admin.kominfo@lubuklinggaukota.go.id', 'kominfo123', 'ADMIN_KOMINFO', 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau', '0812-7890-1234', 'AKTIF'),
  ('USR-SURVEYOR-01', 'M. Tri Saputra', 'tri.saputra@lubuklinggaukota.go.id', 'surveyor123', 'SURVEYOR', 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau', '083196589665', 'AKTIF'),
  ('USR-SURVEYOR-02', 'Yodi Heropralaga', 'yodi.heropralaga@lubuklinggaukota.go.id', 'surveyor123', 'SURVEYOR', 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau', '081373193335', 'AKTIF'),
  ('USR-SURVEYOR-03', 'Andika Yulian Putra', 'andika.yulian@lubuklinggaukota.go.id', 'surveyor123', 'SURVEYOR', 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau', '081373249228', 'AKTIF'),
  ('USR-SURVEYOR-04', 'Pradigga Navigasi', 'pradigga.navigasi@lubuklinggaukota.go.id', 'surveyor123', 'SURVEYOR', 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau', '082251654742', 'AKTIF')
ON CONFLICT (id) DO NOTHING;
