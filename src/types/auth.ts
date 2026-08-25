export type UserRole = 'ADMIN_KOMINFO' | 'SURVEYOR' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  agency: string;
  roleLabel: string;
  phone?: string;
  avatar?: string;
}

export const DEFAULT_ACCOUNTS: (AuthUser & { password: string })[] = [
  {
    id: 'USR-KOMINFO-ADMIN',
    email: 'admin.kominfo@lubuklinggaukota.go.id',
    password: 'kominfo123',
    name: 'Admin DISKOMINFOTIKSAN',
    role: 'ADMIN_KOMINFO',
    roleLabel: 'Admin Teknis & Infrastruktur GIS',
    agency: 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
    phone: '0812-7890-1234',
    avatar: '🏢',
  },
  {
    id: 'USR-SURVEYOR-01',
    email: 'surveyor1@lubuklinggaukota.go.id',
    password: 'surveyor123',
    name: 'Surveyor Lapangan 1',
    role: 'SURVEYOR',
    roleLabel: 'Petugas Survei Spasial & Fiber Optik',
    agency: 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
    phone: '0852-1122-3344',
    avatar: '👨‍💼',
  },
  {
    id: 'USR-SURVEYOR-02',
    email: 'surveyor2@lubuklinggaukota.go.id',
    password: 'surveyor123',
    name: 'Surveyor Lapangan 2',
    role: 'SURVEYOR',
    roleLabel: 'Petugas Pemetaan Tiang & Utilitas',
    agency: 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
    phone: '0853-9988-7766',
    avatar: '👷‍♂️',
  },
];
