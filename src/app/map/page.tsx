import React from 'react';
import GISOverviewMap from '@/components/map/GISOverviewMap';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getSegmentRepository } from '@/repositories/GoogleSheetsSegmentRepository';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';

export const dynamic = 'force-dynamic';

export default async function MapPage({
  searchParams,
}: {
  searchParams?: {
    provider?: string;
    q?: string;
    kecamatan?: string;
    kelurahan?: string;
  };
}) {
  const poleRepo = getPoleRepository();
  const segmentRepo = getSegmentRepository();
  const providerRepo = getProviderRepository();

  const [poles, segments, providers] = await Promise.all([
    poleRepo.findAll(),
    segmentRepo.findAll(),
    providerRepo.findAll(),
  ]);

  return (
    <div className="w-full h-[calc(100vh-10px)] min-h-[500px] relative">
      <GISOverviewMap
        poles={poles}
        segments={segments}
        providers={providers}
        initialProvider={searchParams?.provider}
        initialQuery={searchParams?.q}
      />
    </div>
  );
}
