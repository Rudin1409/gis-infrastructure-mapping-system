export type UserRole = 'ADMIN_KOMINFO' | 'SURVEYOR' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  agency: string;
  team?: 'KOMINFO' | 'BAPENDA';
  roleLabel: string;
  phone?: string;
  avatar?: string;
}

export const DEFAULT_ACCOUNTS: (AuthUser & { password: string; alternativeEmails?: string[] })[] = [
  {
    id: 'USR-KOMINFO-ADMIN',
    email: 'admin.kominfo@lubuklinggaukota.go.id',
    password: 'kominfo123',
    name: 'Admin DISKOMINFOTIKSAN',
    role: 'ADMIN_KOMINFO',
    roleLabel: 'Admin Teknis & Infrastruktur GIS',
    agency: 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
    team: 'KOMINFO',
    phone: '0812-7890-1234',
    avatar: '🏢',
    alternativeEmails: ['admin@lubuklinggaukota.go.id', 'adminkominfo'],
  },
  {
    id: 'USR-SURVEYOR-01',
    email: 'tri.saputra@lubuklinggaukota.go.id',
    password: 'surveyor123',
    name: 'M. Tri Saputra',
    role: 'SURVEYOR',
    roleLabel: 'Petugas Survei Spasial & Pemetaan',
    agency: 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
    team: 'KOMINFO',
    phone: '083196589665',
    avatar: '👨‍💼',
    alternativeEmails: ['trisaputra@lubuklinggaukota.go.id', '083196589665', 'surveyor1@lubuklinggaukota.go.id'],
  },
  {
    id: 'USR-SURVEYOR-02',
    email: 'yodi.heropralaga@lubuklinggaukota.go.id',
    password: 'surveyor123',
    name: 'Yodi Heropralaga',
    role: 'SURVEYOR',
    roleLabel: 'Petugas Survei BAPENDA',
    agency: 'Badan Pendapatan Daerah (BAPENDA) Kota Lubuklinggau',
    team: 'BAPENDA',
    phone: '081373193335',
    avatar: '👷‍♂️',
    alternativeEmails: ['yodi@lubuklinggaukota.go.id', '081373193335', 'surveyor2@lubuklinggaukota.go.id'],
  },
  {
    id: 'USR-SURVEYOR-03',
    email: 'andika.yulian@lubuklinggaukota.go.id',
    password: 'surveyor123',
    name: 'Andika Yulian Putra',
    role: 'SURVEYOR',
    roleLabel: 'Petugas Survei BAPENDA',
    agency: 'Badan Pendapatan Daerah (BAPENDA) Kota Lubuklinggau',
    team: 'BAPENDA',
    phone: '081373249228',
    avatar: '🧑‍💼',
    alternativeEmails: ['andika@lubuklinggaukota.go.id', '081373249228', 'surveyor3@lubuklinggaukota.go.id'],
  },
  {
    id: 'USR-SURVEYOR-04',
    email: 'pradigga.navigasi@lubuklinggaukota.go.id',
    password: 'surveyor123',
    name: 'Pradigga Navigasi',
    role: 'SURVEYOR',
    roleLabel: 'Petugas Survei BAPENDA',
    agency: 'Badan Pendapatan Daerah (BAPENDA) Kota Lubuklinggau',
    team: 'BAPENDA',
    phone: '082251654742',
    avatar: '🧭',
    alternativeEmails: ['pradigga@lubuklinggaukota.go.id', '082251654742', 'surveyor4@lubuklinggaukota.go.id'],
  },
];
