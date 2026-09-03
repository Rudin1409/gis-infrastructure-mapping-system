-- =========================================================================
-- SKEMA & SEED DATA TABEL KELURAHAN (SUBDISTRICTS) - GIS KOTA LUBUKLINGGAU
-- DISKOMINFOTIKSAN KOTA LUBUKLINGGAU
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.subdistricts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kecamatan TEXT NOT NULL,
    code TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query cepat per kecamatan & nama
CREATE INDEX IF NOT EXISTS idx_subdistricts_kecamatan ON public.subdistricts (kecamatan);
CREATE INDEX IF NOT EXISTS idx_subdistricts_name ON public.subdistricts (name);

-- RLS
ALTER TABLE public.subdistricts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on subdistricts" ON public.subdistricts FOR SELECT USING (true);
CREATE POLICY "Allow public insert on subdistricts" ON public.subdistricts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on subdistricts" ON public.subdistricts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on subdistricts" ON public.subdistricts FOR DELETE USING (true);

-- SEED DATA 72 KELURAHAN RESMI (8 KECAMATAN)
INSERT INTO public.subdistricts (id, name, kecamatan, code, order_index) VALUES
  -- 1. Lubuklinggau Timur I (8 Kelurahan)
  ('KEL-T1-01', 'Air Kuti', 'Lubuklinggau Timur I', 'AK', 1),
  ('KEL-T1-02', 'Batu Urip Taba', 'Lubuklinggau Timur I', 'BU', 2),
  ('KEL-T1-03', 'Majapahit', 'Lubuklinggau Timur I', 'MP', 3),
  ('KEL-T1-04', 'Nikan Jaya', 'Lubuklinggau Timur I', 'NJ', 4),
  ('KEL-T1-05', 'Taba Jemekeh', 'Lubuklinggau Timur I', 'TJ', 5),
  ('KEL-T1-06', 'Taba Koji', 'Lubuklinggau Timur I', 'TK', 6),
  ('KEL-T1-07', 'Taba Lestari', 'Lubuklinggau Timur I', 'TL', 7),
  ('KEL-T1-08', 'Watervang', 'Lubuklinggau Timur I', 'WV', 8),

  -- 2. Lubuklinggau Timur II (9 Kelurahan)
  ('KEL-T2-01', 'Cereme Taba', 'Lubuklinggau Timur II', 'CT', 1),
  ('KEL-T2-02', 'Dempo', 'Lubuklinggau Timur II', 'DP', 2),
  ('KEL-T2-03', 'Jawa Kanan', 'Lubuklinggau Timur II', 'JK', 3),
  ('KEL-T2-04', 'Jawa Kiri', 'Lubuklinggau Timur II', 'JR', 4),
  ('KEL-T2-05', 'Karya Bakti', 'Lubuklinggau Timur II', 'KB', 5),
  ('KEL-T2-06', 'Mesat Jaya', 'Lubuklinggau Timur II', 'MJ', 6),
  ('KEL-T2-07', 'Mesat Seni', 'Lubuklinggau Timur II', 'MS', 7),
  ('KEL-T2-08', 'Wira Karya', 'Lubuklinggau Timur II', 'WK', 8),
  ('KEL-T2-09', 'Zellaz', 'Lubuklinggau Timur II', 'ZL', 9),

  -- 3. Lubuklinggau Barat I (11 Kelurahan)
  ('KEL-B1-01', 'Bandung Kiri', 'Lubuklinggau Barat I', 'BK', 1),
  ('KEL-B1-02', 'Bandung Ujung', 'Lubuklinggau Barat I', 'BU', 2),
  ('KEL-B1-03', 'Kayu Ara', 'Lubuklinggau Barat I', 'KA', 3),
  ('KEL-B1-04', 'Lubuk Aman', 'Lubuklinggau Barat I', 'LA', 4),
  ('KEL-B1-05', 'Lubuk Tanjung', 'Lubuklinggau Barat I', 'LT', 5),
  ('KEL-B1-06', 'Pelita Jaya', 'Lubuklinggau Barat I', 'PJ', 6),
  ('KEL-B1-07', 'Pematang Wangi', 'Lubuklinggau Barat I', 'PW', 7),
  ('KEL-B1-08', 'Sukajadi', 'Lubuklinggau Barat I', 'SJ', 8),
  ('KEL-B1-09', 'Tanjung Aman', 'Lubuklinggau Barat I', 'TA', 9),
  ('KEL-B1-10', 'Tanjung Indah', 'Lubuklinggau Barat I', 'TI', 10),
  ('KEL-B1-11', 'Watas Lubuk Durian', 'Lubuklinggau Barat I', 'WL', 11),

  -- 4. Lubuklinggau Barat II (8 Kelurahan)
  ('KEL-B2-01', 'Keputraan', 'Lubuklinggau Barat II', 'KP', 1),
  ('KEL-B2-02', 'Lubuklinggau Ilir', 'Lubuklinggau Barat II', 'LI', 2),
  ('KEL-B2-03', 'Lubuklinggau Ulu', 'Lubuklinggau Barat II', 'LU', 3),
  ('KEL-B2-04', 'Pasar Permiri', 'Lubuklinggau Barat II', 'PP', 4),
  ('KEL-B2-05', 'Sidorejo', 'Lubuklinggau Barat II', 'SR', 5),
  ('KEL-B2-06', 'Tapak Lebar', 'Lubuklinggau Barat II', 'TL', 6),
  ('KEL-B2-07', 'Ulak Lebar', 'Lubuklinggau Barat II', 'UL', 7),
  ('KEL-B2-08', 'Wisma Karya', 'Lubuklinggau Barat II', 'WK', 8),

  -- 5. Lubuklinggau Selatan I (9 Kelurahan)
  ('KEL-S1-01', 'Air Kati', 'Lubuklinggau Selatan I', 'AK', 1),
  ('KEL-S1-02', 'Air Temam', 'Lubuklinggau Selatan I', 'AT', 2),
  ('KEL-S1-03', 'Bakti Karya', 'Lubuklinggau Selatan I', 'BK', 3),
  ('KEL-S1-04', 'Jukung', 'Lubuklinggau Selatan I', 'JK', 4),
  ('KEL-S1-05', 'Kelingi', 'Lubuklinggau Selatan I', 'KL', 5),
  ('KEL-S1-06', 'Lubuk Binjai', 'Lubuklinggau Selatan I', 'LB', 6),
  ('KEL-S1-07', 'Lubuk Kupang', 'Lubuklinggau Selatan I', 'LK', 7),
  ('KEL-S1-08', 'Perumnas Rahmah', 'Lubuklinggau Selatan I', 'PR', 8),
  ('KEL-S1-09', 'Rahmah', 'Lubuklinggau Selatan I', 'RM', 9),

  -- 6. Lubuklinggau Selatan II (9 Kelurahan)
  ('KEL-S2-01', 'Batu Urip', 'Lubuklinggau Selatan II', 'BU', 1),
  ('KEL-S2-02', 'Karang Ketuan', 'Lubuklinggau Selatan II', 'KK', 2),
  ('KEL-S2-03', 'Marga Mulya', 'Lubuklinggau Selatan II', 'MM', 3),
  ('KEL-S2-04', 'Marga Rahayu', 'Lubuklinggau Selatan II', 'MR', 4),
  ('KEL-S2-05', 'Moneng Sepati', 'Lubuklinggau Selatan II', 'MS', 5),
  ('KEL-S2-06', 'Simpang Periuk', 'Lubuklinggau Selatan II', 'SP', 6),
  ('KEL-S2-07', 'Siring Agung', 'Lubuklinggau Selatan II', 'SA', 7),
  ('KEL-S2-08', 'Tabarenah', 'Lubuklinggau Selatan II', 'TB', 8),
  ('KEL-S2-09', 'Tanah Periuk', 'Lubuklinggau Selatan II', 'TP', 9),

  -- 7. Lubuklinggau Utara I (9 Kelurahan)
  ('KEL-U1-01', 'Belalau I', 'Lubuklinggau Utara I', 'B1', 1),
  ('KEL-U1-02', 'Belalau II', 'Lubuklinggau Utara I', 'B2', 2),
  ('KEL-U1-03', 'Durian Rampak', 'Lubuklinggau Utara I', 'DR', 3),
  ('KEL-U1-04', 'Margasari', 'Lubuklinggau Utara I', 'MS', 4),
  ('KEL-U1-05', 'Petanang Ilir', 'Lubuklinggau Utara I', 'PI', 5),
  ('KEL-U1-06', 'Petanang Ulu', 'Lubuklinggau Utara I', 'PU', 6),
  ('KEL-U1-07', 'Sumber Agung', 'Lubuklinggau Utara I', 'SA', 7),
  ('KEL-U1-08', 'Tanjung Raya', 'Lubuklinggau Utara I', 'TR', 8),
  ('KEL-U1-09', 'Taba Baru', 'Lubuklinggau Utara I', 'TB', 9),

  -- 8. Lubuklinggau Utara II (9 Kelurahan)
  ('KEL-U2-01', 'Batu Febri', 'Lubuklinggau Utara II', 'BF', 1),
  ('KEL-U2-02', 'Kenanga', 'Lubuklinggau Utara II', 'KN', 2),
  ('KEL-U2-03', 'Megang', 'Lubuklinggau Utara II', 'MG', 3),
  ('KEL-U2-04', 'Pasar Satelit', 'Lubuklinggau Utara II', 'PS', 4),
  ('KEL-U2-05', 'Ponorogo', 'Lubuklinggau Utara II', 'PN', 5),
  ('KEL-U2-06', 'Puncak Kemuning', 'Lubuklinggau Utara II', 'PK', 6),
  ('KEL-U2-07', 'Senalang', 'Lubuklinggau Utara II', 'SN', 7),
  ('KEL-U2-08', 'Sumberejo', 'Lubuklinggau Utara II', 'SB', 8),
  ('KEL-U2-09', 'Ulaksurung', 'Lubuklinggau Utara II', 'US', 9)
ON CONFLICT (id) DO NOTHING;
