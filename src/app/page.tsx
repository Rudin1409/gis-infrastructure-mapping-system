import { requirePageUser } from '@/lib/security/session';
import React from 'react';
import { dashboardService } from '@/services/DashboardService';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import HomeDashboardClient from '@/components/home/HomeDashboardClient';
import { Pole } from '@/types/pole';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await requirePageUser();
  const allPolesRaw = await getPoleRepository().findAll();
  const stats = await dashboardService.getStats(allPolesRaw);

  // Strip massive base64 photos completely from home dashboard payload
  // (HomeDashboardClient never renders photos; this cuts payload from 40MB down to ~150KB)
  const allPoles: Pole[] = allPolesRaw.map((p) => {
    const { photoUrl, additionalPhotoUrl, photoFileId, additionalPhotoFileId, ...rest } = p;
    return rest as Pole;
  });

  return <HomeDashboardClient stats={stats} allPoles={allPoles} />;
}
