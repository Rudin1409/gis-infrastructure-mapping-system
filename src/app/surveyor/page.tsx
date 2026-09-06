import { requirePageUser } from '@/lib/security/session';
import React from 'react';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import SurveyorPortalClient from '@/components/surveyor/SurveyorPortalClient';

export const dynamic = 'force-dynamic';

export default async function SurveyorPortalPage() {
  await requirePageUser();
  const poleRepo = getPoleRepository();
  const allPoles = await poleRepo.findAll();

  return <SurveyorPortalClient initialPoles={allPoles} />;
}
