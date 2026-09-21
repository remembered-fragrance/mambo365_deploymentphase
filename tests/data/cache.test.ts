import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { clearUserCache, readSyncMark, writeSyncMark } from '@/data/cache';

it('xóa cache phải xóa cursor API để đăng nhập lại kéo đầy đủ dữ liệu', async () => {
  await writeSyncMark('alice', 'timestamp');
  await writeSyncMark('api:alice', '123');
  await writeSyncMark('api:bob', '456');
  await clearUserCache('alice');
  expect(await readSyncMark('alice')).toBeNull();
  expect(await readSyncMark('api:alice')).toBeNull();
  expect(await readSyncMark('api:bob')).toBe('456');
});
