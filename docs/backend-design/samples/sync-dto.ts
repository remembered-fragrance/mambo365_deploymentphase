/** Sync command DTO. CHƯA CHẠY. Cấm table name từ client. */
export const SYNC_COMMAND_TYPES = [
  'listing.createDraft',
  'listing.publish',
  'order.confirm',
  'fulfillment.accept',
  'settlement.declare',
  'legacy.recordReceipt',
] as const;

export type SyncCommandType = (typeof SYNC_COMMAND_TYPES)[number];

export interface SyncCommandDto {
  readonly operationId: string;
  readonly type: SyncCommandType;
  readonly aggregateId: string;
  readonly expectedVersion: number;
  readonly clientCreatedAt: string;
  readonly dependsOn: readonly string[];
  readonly payload: Record<string, unknown>;
}

export interface SyncBatchDto {
  readonly deviceId: string;
  readonly workspaceId: string;
  readonly commands: readonly SyncCommandDto[];
}

export interface SyncCommandResultDto {
  readonly operationId: string;
  readonly status: 'accepted' | 'rejected' | 'conflict' | 'blocked' | 'already_processed';
  readonly version?: number;
  readonly code?: string;
  readonly server?: Record<string, unknown>;
}
