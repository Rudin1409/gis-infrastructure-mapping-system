import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, requestUser } from '@/lib/security/api';
import { readUser, updateUser } from '@/lib/security/store';
import { hashPassword, verifyPassword } from '@/lib/security/password';
import { revokeSession, setSession } from '@/lib/security/session';

const schema = z
  .object({ currentPassword: z.string().min(1).max(256), newPassword: z.string().min(15).max(128) })
  .strict();

export const POST = withAuth(
  async (request: NextRequest) => {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { success: false, error: 'Password baru minimal 15 karakter, maksimal 128.' },
        { status: 400 }
      );
    const row = await readUser(requestUser(request).id);
    if (!row || !(await verifyPassword(parsed.data.currentPassword, row.password))) {
      return NextResponse.json(
        { success: false, error: 'Password saat ini tidak sesuai.' },
        { status: 400 }
      );
    }
    if (parsed.data.currentPassword === parsed.data.newPassword)
      return NextResponse.json(
        { success: false, error: 'Gunakan password baru yang berbeda.' },
        { status: 400 }
      );
    row.password = await hashPassword(parsed.data.newPassword);
    await updateUser(row.id, { password: row.password });
    const response = NextResponse.json({ success: true });
    await revokeSession(request, response);
    await setSession(response, row);
    return response;
  },
  { limit: 5, maxBytes: 4096 }
);
