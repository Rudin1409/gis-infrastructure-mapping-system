import { requirePageUser } from '@/lib/security/session';
import { isAdmin } from '@/lib/security/policy';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  const user = await requirePageUser();
  if (!isAdmin(user)) {
    redirect('/');
  }
  return <AdminClient />;
}
