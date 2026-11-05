import { requirePageUser } from '@/lib/security/session';
import { redirect } from 'next/navigation';
import React from 'react';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import SurveyorPortalClient from '@/components/surveyor/SurveyorPortalClient';

export const dynamic = 'force-dynamic';

export default async function SurveyorPortalPage() {
  const user = await requirePageUser();
  if (user.role === 'PROVIDER_VIEWER') {
    redirect('/poles');
  }
  const poleRepo = getPoleRepository();
  const allPoles = await poleRepo.findAll();

  return <SurveyorPortalClient initialPoles={allPoles} />;
}
