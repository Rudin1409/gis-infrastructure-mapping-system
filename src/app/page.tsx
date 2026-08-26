import React from 'react';
import { dashboardService } from '@/services/DashboardService';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import HomeDashboardClient from '@/components/home/HomeDashboardClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [stats, allPoles] = await Promise.all([
    dashboardService.getStats(),
    getPoleRepository().findAll(),
  ]);

  return <HomeDashboardClient stats={stats} allPoles={allPoles} />;
}
