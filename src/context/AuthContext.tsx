'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { AuthUser } from '@/types/auth';

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (
    profile: Pick<AuthUser, 'name' | 'phone' | 'roleLabel' | 'avatar'>
  ) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoaded: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const OFFLINE_PROFILE = 'inframap_offline_profile';

function cacheOfflineProfile(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(OFFLINE_PROFILE, JSON.stringify(user));
    else localStorage.removeItem(OFFLINE_PROFILE);
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.status === 401) {
        setUser(null);
        cacheOfflineProfile(null);
      } else if (res.ok) {
        const profile = (await res.json()).user;
        setUser(profile);
        cacheOfflineProfile(profile);
      }
      // Network/server failures retain the in-memory identity for an ongoing
      // offline survey; the API independently requires a valid server session.
    } catch {
      // This snapshot only unlocks the offline form on the same device. No API
      // accepts it as proof of login; reconnect always rechecks the server cookie.
      if (!navigator.onLine) {
        try {
          const cached = JSON.parse(localStorage.getItem(OFFLINE_PROFILE) || 'null');
          if (cached?.id && cached?.name) setUser(cached);
        } catch {}
      }
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem('infra_map_auth_user');
    } catch {}
    void refreshSession();
    window.addEventListener('online', refreshSession);
    const expired = () => {
      setUser(null);
      cacheOfflineProfile(null);
    };
    window.addEventListener('inframap-session-expired', expired);
    return () => {
      window.removeEventListener('online', refreshSession);
      window.removeEventListener('inframap-session-expired', expired);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user && pathname !== '/login') router.replace('/login');
    else if (user && pathname === '/login') router.replace('/');
  }, [isLoaded, user, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, error: data.error || 'Gagal masuk.' };
      setUser(data.user);
      cacheOfflineProfile(data.user);
      return { success: true };
    } catch {
      return { success: false, error: 'Server tidak dapat dihubungi. Periksa koneksi.' };
    }
  };

  const updateProfile: AuthContextType['updateProfile'] = async (profile) => {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Profil gagal disimpan.');
    setUser(data.user);
    cacheOfflineProfile(data.user);
  };

  const logout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error();
      setUser(null);
      cacheOfflineProfile(null);
      window.dispatchEvent(new Event('inframap-logout'));
      router.replace('/login');
      router.refresh();
    } catch {
      window.alert(
        'Logout belum selesai. Sambungkan internet lalu coba lagi. Antrean survei tetap tersimpan.'
      );
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, updateProfile, logout, isAuthenticated: !!user, isLoaded }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
