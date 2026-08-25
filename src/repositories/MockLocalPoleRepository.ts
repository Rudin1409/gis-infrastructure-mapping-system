import { IPoleRepository, PoleFilterOptions } from './interfaces/IPoleRepository';
import { Pole, CreatePoleInput, UpdatePoleInput } from '@/types/pole';
import { generatePoleId } from '@/lib/utils/idGenerator';

// Seed sample poles sequentially along Jl. Majapahit, Kota Lubuklinggau
let MOCK_POLES: Pole[] = [
  {
    id: 'LL-0001',
    poleCode: 'LLG-T1-MJ-001',
    poleLatitude: -3.296850,
    poleLongitude: 102.861200,
    deviceLatitude: -3.296855,
    deviceLongitude: 102.861205,
    gpsAccuracy: 3.8,
    distanceFromDevice: 1.2,
    locationMethod: 'MANUAL_MAP_PIN',
    providerId: 'PRV_TELKOM',
    providerName: 'Telkom Indonesia / IndiHome',
    poleType: 'BETON',
    condition: 'GOOD',
    road: 'Jl. Majapahit No. 12 (Simpang Jl. Yos Sudarso)',
    kelurahan: 'Majapahit',
    kecamatan: 'Lubuklinggau Timur I',
    patokanLokasi: 'Sebelah kiri simpang masuk Jl. Majapahit',
    sisiJalan: 'KIRI',
    height: '9m',
    ownershipStatus: 'SENDIRI',
    description: 'Tiang beton 9 meter Telkom, sabuk merah & abu-abu, terpasang ODP 8 port rapi.',
    photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    surveyorName: 'Surveyor DISKOMINFOTIKSAN',
    surveyDate: '2026-08-25',
    surveyTime: '09:15',
    validationStatus: 'VERIFIED',
    createdAt: '2026-08-25T02:15:00.000Z',
    updatedAt: '2026-08-25T02:15:00.000Z',
  },
  {
    id: 'LL-0002',
    poleCode: 'LLG-T1-MJ-002',
    poleLatitude: -3.296520,
    poleLongitude: 102.861450,
    deviceLatitude: -3.296522,
    deviceLongitude: 102.861452,
    gpsAccuracy: 4.1,
    distanceFromDevice: 2.1,
    locationMethod: 'MANUAL_MAP_PIN',
    providerId: 'PRV_ICONNET',
    providerName: 'Iconnet (PLN Icon+)',
    poleType: 'BETON',
    condition: 'GOOD',
    road: 'Jl. Majapahit No. 28 (Depan Toko Roti)',
    kelurahan: 'Majapahit',
    kecamatan: 'Lubuklinggau Timur I',
    patokanLokasi: 'Depan Toko Roti Majapahit Bakery',
    sisiJalan: 'KIRI',
    height: '7m',
    ownershipStatus: 'SENDIRI',
    description: 'Tiang beton Iconnet PLN, strip biru muda, kabel kencang dan aman.',
    photoUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?auto=format&fit=crop&w=800&q=80',
    surveyorName: 'Surveyor DISKOMINFOTIKSAN',
    surveyDate: '2026-08-25',
    surveyTime: '09:30',
    validationStatus: 'VERIFIED',
    createdAt: '2026-08-25T02:30:00.000Z',
    updatedAt: '2026-08-25T02:30:00.000Z',
  },
  {
    id: 'LL-0003',
    poleCode: 'LLG-T1-MJ-003',
    poleLatitude: -3.296180,
    poleLongitude: 102.861720,
    deviceLatitude: -3.296185,
    deviceLongitude: 102.861718,
    gpsAccuracy: 4.5,
    distanceFromDevice: 2.8,
    locationMethod: 'MANUAL_MAP_PIN',
    providerId: 'PRV_BIZNET',
    providerName: 'Biznet Networks',
    poleType: 'BESI',
    condition: 'NEEDS_REPAIR',
    road: 'Jl. Majapahit No. 45 (Tikungan Gang Kenanga I)',
    kelurahan: 'Majapahit',
    kecamatan: 'Lubuklinggau Timur I',
    patokanLokasi: 'Tikungan masuk Gang Kenanga I',
    sisiJalan: 'KANAN',
    height: '7m',
    ownershipStatus: 'SEWA',
    isTilted: true,
    description: 'Tiang besi Biznet sedikit miring ~10 derajat karena tarikan kabel di tikungan.',
    photoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80',
    surveyorName: 'Surveyor DISKOMINFOTIKSAN',
    surveyDate: '2026-08-25',
    surveyTime: '09:45',
    validationStatus: 'SUBMITTED',
    createdAt: '2026-08-25T02:45:00.000Z',
    updatedAt: '2026-08-25T02:45:00.000Z',
  },
  {
    id: 'LL-0004',
    poleCode: 'LLG-T1-MJ-004',
    poleLatitude: -3.295800,
    poleLongitude: 102.862100,
    deviceLatitude: -3.295804,
    deviceLongitude: 102.862102,
    gpsAccuracy: 3.5,
    distanceFromDevice: 1.5,
    locationMethod: 'MANUAL_MAP_PIN',
    providerId: 'PRV_TELKOM',
    providerName: 'Telkom Indonesia / IndiHome',
    poleType: 'BETON',
    condition: 'GOOD',
    road: 'Jl. Majapahit No. 62 (Depan Masjid Al-Ikhlas)',
    kelurahan: 'Majapahit',
    kecamatan: 'Lubuklinggau Timur I',
    patokanLokasi: 'Samping pagar Masjid Al-Ikhlas',
    sisiJalan: 'KIRI',
    height: '9m',
    ownershipStatus: 'SENDIRI',
    description: 'Tiang beton Telkom kondisi sangat baik, ODP terawat.',
    photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    surveyorName: 'Surveyor DISKOMINFOTIKSAN',
    surveyDate: '2026-08-25',
    surveyTime: '10:00',
    validationStatus: 'VERIFIED',
    createdAt: '2026-08-25T03:00:00.000Z',
    updatedAt: '2026-08-25T03:00:00.000Z',
  },
  {
    id: 'LL-0005',
    poleCode: 'LLG-T1-MJ-005',
    poleLatitude: -3.295480,
    poleLongitude: 102.862480,
    deviceLatitude: -3.295482,
    deviceLongitude: 102.862478,
    gpsAccuracy: 4.8,
    distanceFromDevice: 3.0,
    locationMethod: 'MANUAL_MAP_PIN',
    providerId: 'PRV_XL',
    providerName: 'XL Axiata',
    poleType: 'BESI',
    condition: 'GOOD',
    road: 'Jl. Majapahit No. 80 (Simpang Kenanga II)',
    kelurahan: 'Majapahit',
    kecamatan: 'Lubuklinggau Timur I',
    patokanLokasi: 'Sudut pertigaan Gang Kenanga II',
    sisiJalan: 'KANAN',
    height: '7m',
    ownershipStatus: 'SENDIRI',
    description: 'Tiang besi XL dengan 3 strip putih di bagian tengah, kabel rapi.',
    photoUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?auto=format&fit=crop&w=800&q=80',
    surveyorName: 'Surveyor DISKOMINFOTIKSAN',
    surveyDate: '2026-08-25',
    surveyTime: '10:15',
    validationStatus: 'VERIFIED',
    createdAt: '2026-08-25T03:15:00.000Z',
    updatedAt: '2026-08-25T03:15:00.000Z',
  },
  {
    id: 'LL-0006',
    poleCode: 'LLG-T1-MJ-006',
    poleLatitude: -3.295150,
    poleLongitude: 102.862850,
    deviceLatitude: -3.295154,
    deviceLongitude: 102.862848,
    gpsAccuracy: 5.0,
    distanceFromDevice: 2.4,
    locationMethod: 'MANUAL_MAP_PIN',
    providerId: 'PRV_IFORTE',
    providerName: 'iForte',
    poleType: 'BESI',
    condition: 'GOOD',
    road: 'Jl. Majapahit No. 98 (Dekat Lapangan Voli)',
    kelurahan: 'Majapahit',
    kecamatan: 'Lubuklinggau Timur I',
    patokanLokasi: 'Samping pos ronda dekat lapangan voli',
    sisiJalan: 'KIRI',
    height: '7m',
    ownershipStatus: 'SENDIRI',
    description: 'Tiang iForte strip Biru-Putih-Biru di pucuk, kondisi prima.',
    photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    surveyorName: 'Surveyor DISKOMINFOTIKSAN',
    surveyDate: '2026-08-25',
    surveyTime: '10:30',
    validationStatus: 'VERIFIED',
    createdAt: '2026-08-25T03:30:00.000Z',
    updatedAt: '2026-08-25T03:30:00.000Z',
  },
  {
    id: 'LL-0007',
    poleCode: 'LLG-T1-MJ-007',
    poleLatitude: -3.294800,
    poleLongitude: 102.863250,
    deviceLatitude: -3.294805,
    deviceLongitude: 102.863248,
    gpsAccuracy: 5.2,
    distanceFromDevice: 3.5,
    locationMethod: 'MANUAL_MAP_PIN',
    providerId: 'PRV_MYREP_1',
    providerName: 'MyRepublic',
    poleType: 'BESI',
    condition: 'GOOD',
    road: 'Jl. Majapahit Ujung (Batas Taba Koring)',
    kelurahan: 'Majapahit',
    kecamatan: 'Lubuklinggau Timur I',
    patokanLokasi: 'Gerbang perbatasan ujung Jl. Majapahit',
    sisiJalan: 'KANAN',
    height: '7m',
    ownershipStatus: 'SENDIRI',
    description: 'Tiang MyRepublic pucuk ungu khas, jalur fiber optik aktif.',
    photoUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?auto=format&fit=crop&w=800&q=80',
    surveyorName: 'Surveyor DISKOMINFOTIKSAN',
    surveyDate: '2026-08-25',
    surveyTime: '10:45',
    validationStatus: 'VERIFIED',
    createdAt: '2026-08-25T03:45:00.000Z',
    updatedAt: '2026-08-25T03:45:00.000Z',
  },
];

export class MockLocalPoleRepository implements IPoleRepository {
  async findAll(options?: PoleFilterOptions): Promise<Pole[]> {
    let result = [...MOCK_POLES];

    if (options?.providerId && options.providerId !== 'ALL') {
      result = result.filter((p) => p.providerId === options.providerId);
    }
    if (options?.condition && options.condition !== 'ALL') {
      result = result.filter((p) => p.condition === options.condition);
    }
    if (options?.kecamatan && options.kecamatan !== 'ALL') {
      result = result.filter((p) => p.kecamatan === options.kecamatan);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.road.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          p.kelurahan.toLowerCase().includes(q) ||
          (p.providerName && p.providerName.toLowerCase().includes(q))
      );
    }

    return result;
  }

  async findById(id: string): Promise<Pole | null> {
    const pole = MOCK_POLES.find((p) => p.id === id);
    return pole || null;
  }

  async getExistingIds(): Promise<string[]> {
    return MOCK_POLES.map((p) => p.id);
  }

  async create(input: CreatePoleInput): Promise<Pole> {
    const now = new Date().toISOString();
    const newPole: Pole = {
      id: generatePoleId(),
      ...input,
      surveyDate: input.surveyDate || now.split('T')[0],
      locationMethod: input.locationMethod || 'MANUAL_MAP_PIN',
      validationStatus: input.validationStatus || 'SUBMITTED',
      createdAt: now,
      updatedAt: now,
    };

    MOCK_POLES.unshift(newPole);
    return newPole;
  }

  async update(id: string, input: UpdatePoleInput): Promise<Pole> {
    const index = MOCK_POLES.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Pole with ID ${id} not found`);
    }

    const existing = MOCK_POLES[index];
    const updated: Pole = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    MOCK_POLES[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const initialLen = MOCK_POLES.length;
    MOCK_POLES = MOCK_POLES.filter((p) => p.id !== id);
    return MOCK_POLES.length < initialLen;
  }

  async count(options?: PoleFilterOptions): Promise<number> {
    const list = await this.findAll(options);
    return list.length;
  }
}
