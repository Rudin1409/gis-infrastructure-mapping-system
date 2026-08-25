export type NetworkType = 'FIBER_OPTIC' | 'COPPER' | 'COAXIAL' | 'OTHER';

export type InstallationType = 'AERIAL' | 'UNDERGROUND' | 'OTHER';

export type SegmentStatus = 'ACTIVE' | 'MAINTENANCE' | 'DISMANTLED' | 'UNKNOWN';

export interface NetworkSegment {
  id: string; // e.g. "SEG-0001"
  segmentCode?: string;
  fromNodeId: string; // ID of start Pole or Node (e.g. "LL-0001")
  toNodeId: string; // ID of end Pole or Node (e.g. "LL-0002")
  providerId: string;
  providerName?: string;
  networkType: NetworkType;
  installationType: InstallationType;
  estimatedDistance: number; // in meters (calculated spatial distance)
  status: SegmentStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSegmentInput {
  segmentCode?: string;
  fromNodeId: string;
  toNodeId: string;
  providerId: string;
  networkType: NetworkType;
  installationType: InstallationType;
  estimatedDistance?: number;
  status: SegmentStatus;
  description?: string;
}
