import { requirePageUser } from '@/lib/security/session';
import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import EditPoleForm from '@/components/survey/EditPoleForm';

export const dynamic = 'force-dynamic';

export default async function EditPolePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;
  if (user.role === 'PROVIDER_VIEWER') {
    redirect(`/poles/${id}`);
  }
  const poleRepo = getPoleRepository();
  const providerRepo = getProviderRepository();

  const [pole, providers] = await Promise.all([poleRepo.findById(id), providerRepo.findAll()]);

  if (!pole) {
    notFound();
  }

  return <EditPoleForm pole={pole} providers={providers} />;
}
