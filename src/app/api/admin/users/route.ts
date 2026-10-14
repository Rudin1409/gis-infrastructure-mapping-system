import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, isPostgresConfigured } from '@/lib/postgres';
import { supabase } from '@/lib/supabase';
import { withAuth } from '@/lib/security/api';
import { hashPassword } from '@/lib/security/password';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Ambil semua user (kecuali akun sistem terproteksi)
async function handleGet(req: NextRequest) {
  try {
    let users = [];
    if (isPostgresConfigured()) {
      const res = await dbQuery(`
        SELECT id, name, email, role, agency, phone, status, team, role_label, created_at, updated_at
        FROM users
        WHERE id NOT LIKE '\\_%'
        ORDER BY 
          CASE WHEN role = 'ADMIN_KOMINFO' THEN 1 WHEN role = 'SUPER_ADMIN' THEN 2 ELSE 3 END,
          name ASC
      `);
      users = res.rows;
    } else {
      const { data, error } = await supabase
        .from('users')
        .select(
          'id, name, email, role, agency, phone, status, team, role_label, created_at, updated_at'
        )
        .not('id', 'like', '_%')
        .order('name');
      if (error) throw error;
      users = data || [];
    }

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (err: any) {
    console.error('[API Users GET] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data pengguna.' },
      { status: 500 }
    );
  }
}

// POST: Tambah user baru
async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      role = 'SURVEYOR',
      agency,
      team,
      phone,
      status = 'AKTIF',
      role_label,
    } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Nama, Email, dan Password wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanRole = role.toUpperCase();
    const cleanTeam = team || (cleanRole === 'ADMIN_KOMINFO' ? 'KOMINFO' : 'SURVEYOR');
    const cleanAgency =
      agency ||
      (cleanTeam === 'KOMINFO'
        ? 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau'
        : 'Badan Pendapatan Daerah (BAPENDA) Kota Lubuklinggau');
    const cleanRoleLabel =
      role_label ||
      (cleanRole === 'ADMIN_KOMINFO'
        ? 'Admin Teknis & Infrastruktur GIS'
        : 'Petugas Survei Spasial & Pemetaan');

    // Cek duplikasi email
    if (isPostgresConfigured()) {
      const existing = await dbQuery('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [
        cleanEmail,
      ]);
      if (existing.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Email sudah terdaftar untuk pengguna lain.' },
          { status: 400 }
        );
      }
    }

    // Generate ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newId =
      cleanRole === 'ADMIN_KOMINFO' ? `USR-ADMIN-${randomSuffix}` : `USR-SURVEYOR-${randomSuffix}`;

    const hashedPassword = await hashPassword(password);
    const now = new Date().toISOString();

    if (isPostgresConfigured()) {
      await dbQuery(
        `INSERT INTO users (id, name, email, password, role, agency, phone, status, team, role_label, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          newId,
          name.trim(),
          cleanEmail,
          hashedPassword,
          cleanRole,
          cleanAgency,
          cleanPhone,
          status,
          cleanTeam,
          cleanRoleLabel,
          now,
          now,
        ]
      );
    } else {
      const { error } = await supabase.from('users').insert({
        id: newId,
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: cleanRole,
        agency: cleanAgency,
        phone: cleanPhone,
        status,
        team: cleanTeam,
        role_label: cleanRoleLabel,
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Pengguna berhasil ditambahkan.',
      data: { id: newId, name, email: cleanEmail, role: cleanRole, team: cleanTeam, status },
    });
  } catch (err: any) {
    console.error('[API Users POST] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan pengguna baru.' },
      { status: 500 }
    );
  }
}

// PUT: Perbarui data user
async function handlePut(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, password, role, agency, team, phone, status, role_label } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID Pengguna wajib disertakan.' },
        { status: 400 }
      );
    }

    if (id.startsWith('_')) {
      return NextResponse.json(
        { success: false, error: 'Akun sistem tidak dapat dimodifikasi di sini.' },
        { status: 403 }
      );
    }

    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    const now = new Date().toISOString();

    if (isPostgresConfigured()) {
      // Cek apakah ada update password
      if (password && password.trim().length > 0) {
        const hashedPassword = await hashPassword(password.trim());
        await dbQuery(
          `UPDATE users 
           SET name = COALESCE($1, name),
               email = COALESCE($2, email),
               password = $3,
               role = COALESCE($4, role),
               agency = COALESCE($5, agency),
               team = COALESCE($6, team),
               phone = COALESCE($7, phone),
               status = COALESCE($8, status),
               role_label = COALESCE($9, role_label),
               updated_at = $10
           WHERE id = $11`,
          [
            name?.trim(),
            cleanEmail,
            hashedPassword,
            role,
            agency,
            team,
            phone,
            status,
            role_label,
            now,
            id,
          ]
        );
      } else {
        await dbQuery(
          `UPDATE users 
           SET name = COALESCE($1, name),
               email = COALESCE($2, email),
               role = COALESCE($3, role),
               agency = COALESCE($4, agency),
               team = COALESCE($5, team),
               phone = COALESCE($6, phone),
               status = COALESCE($7, status),
               role_label = COALESCE($8, role_label),
               updated_at = $9
           WHERE id = $10`,
          [name?.trim(), cleanEmail, role, agency, team, phone, status, role_label, now, id]
        );
      }
    } else {
      const updates: any = { updated_at: now };
      if (name) updates.name = name.trim();
      if (cleanEmail) updates.email = cleanEmail;
      if (role) updates.role = role;
      if (agency) updates.agency = agency;
      if (team) updates.team = team;
      if (phone !== undefined) updates.phone = phone;
      if (status) updates.status = status;
      if (role_label) updates.role_label = role_label;
      if (password && password.trim().length > 0) {
        updates.password = await hashPassword(password.trim());
      }

      const { error } = await supabase.from('users').update(updates).eq('id', id);
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Data pengguna berhasil diperbarui.',
    });
  } catch (err: any) {
    console.error('[API Users PUT] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui data pengguna.' },
      { status: 500 }
    );
  }
}

// DELETE: Hapus user
async function handleDelete(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID Pengguna wajib disertakan.' },
        { status: 400 }
      );
    }

    if (id === 'USR-KOMINFO-ADMIN' || id.startsWith('_')) {
      return NextResponse.json(
        { success: false, error: 'Akun Administrator Utama Sistem tidak boleh dihapus.' },
        { status: 403 }
      );
    }

    if (isPostgresConfigured()) {
      await dbQuery('DELETE FROM auth_sessions WHERE user_id = $1', [id]);
      await dbQuery('DELETE FROM users WHERE id = $1', [id]);
    } else {
      await supabase.from('auth_sessions').delete().eq('user_id', id);
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Pengguna berhasil dihapus.',
    });
  } catch (err: any) {
    console.error('[API Users DELETE] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus pengguna.' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet, { admin: true });
export const POST = withAuth(handlePost, { admin: true });
export const PUT = withAuth(handlePut, { admin: true });
export const DELETE = withAuth(handleDelete, { admin: true });
