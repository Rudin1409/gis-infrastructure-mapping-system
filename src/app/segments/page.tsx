import React from 'react';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import CableAuditClient from '@/components/survey/CableAuditClient';

export const dynamic = 'force-dynamic';

export default async function SegmentsPage() {
  const poleRepo = getPoleRepository();
  const providerRepo = getProviderRepository();

  const [allPoles, providers] = await Promise.all([
    poleRepo.findAll(),
    providerRepo.findAll(),
  ]);

  return <CableAuditClient poles={allPoles} providers={providers} />;
}
