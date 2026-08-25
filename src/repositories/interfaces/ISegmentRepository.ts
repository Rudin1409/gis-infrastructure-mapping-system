import { NetworkSegment, CreateSegmentInput } from '@/types/segment';

export interface ISegmentRepository {
  findAll(): Promise<NetworkSegment[]>;
  findById(id: string): Promise<NetworkSegment | null>;
  findByNodeId(nodeId: string): Promise<NetworkSegment[]>;
  create(data: CreateSegmentInput): Promise<NetworkSegment>;
  delete(id: string): Promise<boolean>;
}
