import { requirePageUser } from '@/lib/security/session';
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
  searchParams?: Promise<{
    provider?: string;
    q?: string;
    search?: string;
    condition?: string;
    category?: string;
    surveyor?: string;
    kecamatan?: string;
    kelurahan?: string;
    date?: string;
    surveyDate?: string;
    type?: string;
  }>;
}) {
  await requirePageUser();
  const query = await searchParams;
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
        initialProvider={query?.provider}
        initialQuery={query?.q || query?.search}
        initialCondition={query?.condition}
        initialCategory={query?.category}
        initialSurveyor={query?.surveyor}
        initialKecamatan={query?.kecamatan}
        initialKelurahan={query?.kelurahan}
        initialSurveyDate={query?.date || query?.surveyDate}
        initialType={query?.type}
        isLicenseLocked={licenseConfig.isLocked}
        licenseReason={licenseConfig.reason}
      />
    </div>
  );
}
