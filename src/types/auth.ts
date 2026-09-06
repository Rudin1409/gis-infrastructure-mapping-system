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
