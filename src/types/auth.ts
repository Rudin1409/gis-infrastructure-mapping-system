export type UserRole = 'ADMIN_KOMINFO' | 'ADMIN_BAPENDA' | 'SURVEYOR' | 'SUPER_ADMIN';

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
    name: 'Admin DISKOMINFO',
    role: 'ADMIN_KOMINFO',
    roleLabel: 'Admin Teknis & Jaringan',
    agency: 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
    phone: '0812-7890-1234',
    avatar: '🏢',
  },
  {
    id: 'USR-BAPENDA-ADMIN',
    email: 'admin.bapenda@lubuklinggaukota.go.id',
    password: 'bapenda123',
    name: 'Admin BAPENDA',
    role: 'ADMIN_BAPENDA',
    roleLabel: 'Admin Pajak & Retribusi Tiang',
    agency: 'Badan Pendapatan Daerah Kota Lubuklinggau',
    phone: '0813-6789-5678',
    avatar: '🏛️',
  },
  {
    id: 'USR-SURVEYOR-01',
    email: 'surveyor1@lubuklinggaukota.go.id',
    password: 'surveyor123',
    name: 'Surveyor 1 (Kominfo)',
    role: 'SURVEYOR',
    roleLabel: 'Petugas Lapangan GIS',
    agency: 'Dinas Kominfo Lubuklinggau',
    phone: '0852-1122-3344',
    avatar: '👨‍💼',
  },
  {
    id: 'USR-SURVEYOR-02',
    email: 'surveyor2@lubuklinggaukota.go.id',
    password: 'surveyor123',
    name: 'Surveyor 2 (Bapenda)',
    role: 'SURVEYOR',
    roleLabel: 'Petugas Lapangan Retribusi',
    agency: 'Badan Pendapatan Daerah Lubuklinggau',
    phone: '0853-9988-7766',
    avatar: '👷‍♂️',
  },
];
