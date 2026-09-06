import React from 'react';
import { notFound } from 'next/navigation';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import EditPoleForm from '@/components/survey/EditPoleForm';

export const dynamic = 'force-dynamic';

export default async function EditPolePage({ params }: { params: { id: string } }) {
  const poleRepo = getPoleRepository();
  const providerRepo = getProviderRepository();

  const [pole, providers] = await Promise.all([
    poleRepo.findById(params.id),
    providerRepo.findAll(),
  ]);

  if (!pole) {
    notFound();
  }

  return <EditPoleForm pole={pole} providers={providers} />;
}
