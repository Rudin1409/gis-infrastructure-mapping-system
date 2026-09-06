import React from 'react';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import CableAuditClient from '@/components/survey/CableAuditClient';

export const dynamic = 'force-dynamic';

export default async function SegmentsPage({
  searchParams,
}: {
  searchParams?:
    | Promise<{ filter?: string; type?: string; q?: string }>
    | { filter?: string; type?: string; q?: string };
}) {
  const poleRepo = getPoleRepository();
  const providerRepo = getProviderRepository();

  const resolvedParams = searchParams ? await searchParams : {};
  const filterParam = (resolvedParams.filter || resolvedParams.type || '').toUpperCase();
  const initialFilter =
    filterParam === 'UNDERGROUND' || filterParam === 'BAWAH_TANAH'
      ? 'UNDERGROUND'
      : filterParam === 'MESSY' || filterParam === 'MESSY_CABLE'
        ? 'MESSY_CABLE'
        : filterParam === 'LOW' || filterParam === 'LOW_CABLE'
          ? 'LOW_CABLE'
          : filterParam === 'TILTED'
            ? 'TILTED'
            : filterParam === 'PJU' || filterParam === 'PJU_BROKEN'
              ? 'PJU_BROKEN'
              : filterParam === 'ALL_POLES'
                ? 'ALL_POLES'
                : 'ALL_ISSUES';

  const [allPoles, providers] = await Promise.all([poleRepo.findAll(), providerRepo.findAll()]);

  return (
    <CableAuditClient
      poles={allPoles}
      providers={providers}
      initialFilter={initialFilter}
      initialQuery={resolvedParams.q || ''}
    />
  );
}
