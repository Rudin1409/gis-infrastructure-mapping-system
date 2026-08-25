import { Provider } from '@/types/provider';

export interface IProviderRepository {
  findAll(): Promise<Provider[]>;
  findById(id: string): Promise<Provider | null>;
  create(provider: Provider): Promise<Provider>;
}
