'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthUser, DEFAULT_ACCOUNTS } from '@/types/auth';

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAs: (account: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoaded: boolean;
}

const STORAGE_KEY = 'infra_map_auth_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          setUser(parsed);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.warn('Could not read auth from storage:', e);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Auth gate redirection
  useEffect(() => {
    if (!isLoaded) return;

    if (!isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    } else if (isAuthenticated && pathname === '/login') {
      router.replace('/');
    }
  }, [isLoaded, isAuthenticated, pathname, router]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Email atau kata sandi tidak cocok. Silakan periksa kembali.',
        };
      }

      const authUserData: AuthUser = data.user;
      setUser(authUserData);
      setIsAuthenticated(true);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authUserData));
      } catch (e) {}

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Gagal menghubungi server verifikasi.',
      };
    }
  };

  const loginAs = (account: AuthUser) => {
    setUser(account);
    setIsAuthenticated(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    } catch (e) {}
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    router.replace('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginAs,
        logout,
        isAuthenticated,
        isLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
