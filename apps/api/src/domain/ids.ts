import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const newId = (): string => randomUUID();

export const sha256 = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('hex');

export const SYSTEM_ROLE_IDS = {
  owner: '22222222-2222-4222-8222-000000000001',
  manager: '22222222-2222-4222-8222-000000000002',
  procurement: '22222222-2222-4222-8222-000000000003',
  sales: '22222222-2222-4222-8222-000000000004',
  warehouse: '22222222-2222-4222-8222-000000000005',
  accountant: '22222222-2222-4222-8222-000000000006',
  viewer: '22222222-2222-4222-8222-000000000007',
} as const;

export const COMMODITY_IDS = {
  rubberLatex: '11111111-1111-4111-8111-111111111111',
  cashew: '11111111-1111-4111-8111-111111111112',
  coffee: '11111111-1111-4111-8111-111111111113',
  pepper: '11111111-1111-4111-8111-111111111114',
} as const;

export type SystemRole = keyof typeof SYSTEM_ROLE_IDS;
