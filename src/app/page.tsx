import { requirePageUser } from '@/lib/security/session';
import React from 'react';
import { dashboardService } from '@/services/DashboardService';
import HomeDashboardClient from '@/components/home/HomeDashboardClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await requirePageUser();
  const stats = await dashboardService.getStats();

  return <HomeDashboardClient stats={stats} allPoles={[]} />;
}
