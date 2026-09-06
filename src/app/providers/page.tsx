import { requirePageUser } from '@/lib/security/session';
import React from 'react';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import ProvidersSummaryClient from '@/components/providers/ProvidersSummaryClient';

export const dynamic = 'force-dynamic';

export default async function ProvidersPage() {
  await requirePageUser();
  const poleRepo = getPoleRepository();
  const providerRepo = getProviderRepository();

  const [allPoles, providers] = await Promise.all([poleRepo.findAll(), providerRepo.findAll()]);

  return (
    <div className="min-h-screen bg-slate-100">
      <ProvidersSummaryClient initialPoles={allPoles} providers={providers} />
    </div>
  );
}
