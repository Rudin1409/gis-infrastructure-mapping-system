import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, requestUser } from '@/lib/security/api';
import { updateUser, readUser } from '@/lib/security/store';
import { publicUser } from '@/lib/security/session';

const schema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[+\d\s()-]*$/),
    roleLabel: z.string().trim().max(120),
    avatar: z.string().max(32),
  })
  .strict();

export const PUT = withAuth(
  async (request: NextRequest) => {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { success: false, error: 'Data profil tidak valid.' },
        { status: 400 }
      );
    const user = requestUser(request);
    await updateUser(user.id, {
      name: parsed.data.name,
      phone: parsed.data.phone,
      role_label: parsed.data.roleLabel,
      avatar: parsed.data.avatar,
    });
    return NextResponse.json({ success: true, user: publicUser(await readUser(user.id)) });
  },
  { limit: 10, maxBytes: 4096 }
);
