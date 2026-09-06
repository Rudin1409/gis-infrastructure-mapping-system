import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requestUser } from '@/lib/security/api';

export const GET = withAuth(async (request: NextRequest) =>
  NextResponse.json({ success: true, user: requestUser(request) })
);
