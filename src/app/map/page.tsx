import React from 'react';
import GISOverviewMap from '@/components/map/GISOverviewMap';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getSegmentRepository } from '@/repositories/GoogleSheetsSegmentRepository';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import { getSystemLicenseConfig } from '@/lib/systemLicense';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MapPage({
  searchParams,
}: {
  searchParams?: {
    provider?: string;
    q?: string;
    search?: string;
    surveyor?: string;
    kecamatan?: string;
    kelurahan?: string;
  };
}) {
  const poleRepo = getPoleRepository();
  const segmentRepo = getSegmentRepository();
  const providerRepo = getProviderRepository();

  const [poles, segments, providers, licenseConfig] = await Promise.all([
    poleRepo.findAll(),
    segmentRepo.findAll(),
    providerRepo.findAll(),
    getSystemLicenseConfig(),
  ]);

  return (
    <div className="w-full h-[calc(100vh-10px)] min-h-[500px] relative">
      <GISOverviewMap
        poles={poles}
        segments={segments}
        providers={providers}
        initialProvider={searchParams?.provider}
        initialQuery={searchParams?.q || searchParams?.search}
        initialSurveyor={searchParams?.surveyor}
        isLicenseLocked={licenseConfig.isLocked}
        licenseReason={licenseConfig.reason}
      />
    </div>
  );
}
