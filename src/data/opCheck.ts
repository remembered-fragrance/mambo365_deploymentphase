/**
 * Kiểm op bằng đúng luật máy chủ dùng (`parseSyncOp`) TRƯỚC khi đưa vào hàng đợi. Hàng đợi gửi theo
 * thứ tự, op đầu hàng bị từ chối thì mọi op sau đứng chờ — op chắc chắn bị từ chối không được vào.
 */

import { parseSyncOp } from '@mambo/contracts';
import type { NewOp } from './queue';

/** Chỉ để qua được vỏ op; `parseSyncOp` không kiểm opId / seq. */
const PLACEHOLDER_OP_ID = '00000000-0000-4000-8000-000000000000';

/** Lý do máy chủ sẽ từ chối op này, hoặc `null` nếu hợp lệ. */
export const opProblem = (op: NewOp): string | null => {
  const check = parseSyncOp({
    opId: PLACEHOLDER_OP_ID,
    seq: 1,
    entity: op.entity,
    kind: op.kind,
    recordId: op.recordId,
    ...(op.kind === 'softDelete' ? {} : { data: op.data ?? {} }),
  });
  if (check.ok) return null;
  const [field, message] = Object.entries(check.fields)[0] ?? ['', 'không hợp lệ'];
  return `${op.entity}.${field}: ${message}`;
};
