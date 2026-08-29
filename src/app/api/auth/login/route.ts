import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_ACCOUNTS } from '@/types/auth';
import { isAppsScriptConfigured, APPS_SCRIPT_URL } from '@/lib/google/appsScriptClient';
import { dbQuery, isPostgresConfigured } from '@/lib/postgres';

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
    const cleanPhoneQuery = trimmedEmail.replace(/[^0-9]/g, '');

    // 1. Verifikasi kredensial langsung via database utama
    if (isPostgresConfigured()) {
      try {
        const phoneLike = cleanPhoneQuery.length >= 8 ? cleanPhoneQuery : 'NOMATCH';
        const { rows } = await dbQuery(
          `
            SELECT *
            FROM users
            WHERE password = $1
              AND (
                LOWER(email) = LOWER($2)
                OR (
                  $3 <> 'NOMATCH'
                  AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') LIKE '%' || $3 || '%'
                )
              )
            LIMIT 1
          `,
          [password, trimmedEmail, phoneLike]
        );

        const dbUser = rows[0];
        if (dbUser) {
          return NextResponse.json({
            success: true,
            user: {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              role: dbUser.role,
              roleLabel: dbUser.role === 'ADMIN_KOMINFO' ? 'Administrator DISKOMINFOTIKSAN' : 'Petugas Survei Spasial',
              agency: dbUser.agency || 'DISKOMINFOTIKSAN Kota Lubuklinggau',
              phone: dbUser.phone,
              avatar: dbUser.role === 'ADMIN_KOMINFO' ? '🏢' : '👨‍💼',
            },
            source: 'SERVER_DATABASE',
          });
        }
      } catch (dbErr) {
        console.warn('Server auth notice:', dbErr);
      }
    } else {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: dbUser, error: dbErr } = await supabase
          .from('users')
          .select('*')
          .or(`email.ilike.${trimmedEmail},phone.ilike.%${cleanPhoneQuery.length >= 8 ? cleanPhoneQuery : 'NOMATCH'}%`)
          .eq('password', password)
          .single();

        if (!dbErr && dbUser) {
          return NextResponse.json({
            success: true,
            user: {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              role: dbUser.role,
              roleLabel: dbUser.role === 'ADMIN_KOMINFO' ? 'Administrator DISKOMINFOTIKSAN' : 'Petugas Survei Spasial',
              agency: dbUser.agency || 'DISKOMINFOTIKSAN Kota Lubuklinggau',
              phone: dbUser.phone,
              avatar: dbUser.role === 'ADMIN_KOMINFO' ? '🏢' : '👨‍💼',
            },
            source: 'SERVER_DATABASE',
          });
        }
      } catch (supaErr) {
        console.warn('Server auth notice:', supaErr);
      }
    }

    // 2. Fallback Apps Script
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

    // 3. Fallback: Verifikasi dengan master akun dinas Lubuklinggau
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
        source: 'SERVER_DATABASE',
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
