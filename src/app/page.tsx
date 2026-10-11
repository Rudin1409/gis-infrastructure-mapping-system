import { requirePageUser } from '@/lib/security/session';
import React from 'react';
import { dashboardService } from '@/services/DashboardService';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import HomeDashboardClient from '@/components/home/HomeDashboardClient';
import { Pole } from '@/types/pole';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await requirePageUser();
  const [stats, allPolesRaw] = await Promise.all([
    dashboardService.getStats(),
    getPoleRepository().findAll(),
  ]);

  // Find IDs of the 6 most recent poles for thumbnail display
  const sorted = [...allPolesRaw].sort((a, b) => {
    const timeA = a.createdAt
      ? new Date(a.createdAt).getTime()
      : a.surveyDate
        ? new Date(a.surveyDate).getTime()
        : 0;
    const timeB = b.createdAt
      ? new Date(b.createdAt).getTime()
      : b.surveyDate
        ? new Date(b.surveyDate).getTime()
        : 0;
    return timeB - timeA;
  });
  const recentIds = new Set(sorted.slice(0, 6).map((p) => p.id));

  // Strip heavy base64 photos from all historical poles (saves 99% bandwidth and eliminates slow reload)
  const allPoles: Pole[] = allPolesRaw.map((p) => {
    if (recentIds.has(p.id)) {
      return p;
    }
    const { photoUrl, additionalPhotoUrl, photoFileId, additionalPhotoFileId, ...rest } = p;
    return rest as Pole;
  });

  return <HomeDashboardClient stats={stats} allPoles={allPoles} />;
}
