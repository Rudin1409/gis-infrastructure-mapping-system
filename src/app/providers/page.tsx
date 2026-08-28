import React from 'react';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import ProvidersSummaryClient from '@/components/providers/ProvidersSummaryClient';

export const dynamic = 'force-dynamic';

export default async function ProvidersPage() {
  const poleRepo = getPoleRepository();
  const providerRepo = getProviderRepository();

  const [allPoles, providers] = await Promise.all([
    poleRepo.findAll(),
    providerRepo.findAll(),
  ]);

  return (
    <div className="p-4">
      <ProvidersSummaryClient initialPoles={allPoles} providers={providers} />
    </div>
  );
}
