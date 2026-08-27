import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_ACCOUNTS } from '@/types/auth';
import { isAppsScriptConfigured, APPS_SCRIPT_URL } from '@/lib/google/appsScriptClient';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email dan kata sandi wajib diisi' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Verifikasi kredensial langsung via Google Apps Script (DATA_SURVEYOR)
    if (isAppsScriptConfigured()) {
      try {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'login',
            email: trimmedEmail,
            password: password,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.user) {
            return NextResponse.json({
              success: true,
              user: json.user,
              source: 'GOOGLE_SHEETS_DATA_SURVEYOR',
            });
          }
        }
      } catch (err) {
        console.warn('Apps Script login verification notice, checking local fallback:', err);
      }
    }

    // 2. Fallback: Verifikasi dengan master akun dinas Lubuklinggau
    const cleanPhoneQuery = trimmedEmail.replace(/[^0-9]/g, '');
    const matched = DEFAULT_ACCOUNTS.find((acc) => {
      if (acc.password !== password) return false;
      const accCleanPhone = (acc.phone || '').replace(/[^0-9]/g, '');
      return (
        acc.email.toLowerCase() === trimmedEmail ||
        (cleanPhoneQuery.length >= 8 && accCleanPhone === cleanPhoneQuery) ||
        acc.alternativeEmails?.some((alt) => alt.toLowerCase() === trimmedEmail)
      );
    });

    if (matched) {
      const authUser = {
        id: matched.id,
        name: matched.name,
        email: matched.email,
        role: matched.role,
        roleLabel: matched.roleLabel,
        agency: matched.agency,
        phone: matched.phone,
        avatar: matched.avatar,
      };

      return NextResponse.json({
        success: true,
        user: authUser,
        source: 'MASTER_ACCOUNTS',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Email atau kata sandi tidak cocok. Silakan periksa kembali kredensial Anda.',
      },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
