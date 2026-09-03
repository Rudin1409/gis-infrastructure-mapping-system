import React from 'react';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getDistrictRepository } from '@/repositories/DistrictRepositoryFactory';
import DistrictsManagerClient from '@/components/districts/DistrictsManagerClient';

export const dynamic = 'force-dynamic';

export default async function DistrictsPage() {
  const poleRepo = getPoleRepository();
  const districtRepo = getDistrictRepository();

  const [allPoles, districtGroups] = await Promise.all([
    poleRepo.findAll(),
    districtRepo.getGroupedDistricts(),
  ]);

  return (
    <DistrictsManagerClient
      initialDistricts={districtGroups}
      allPoles={allPoles}
    />
  );
}
