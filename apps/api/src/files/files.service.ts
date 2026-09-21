import { Injectable } from '@nestjs/common';
import { fail, must } from '../domain/errors';
import { newId } from '../domain/ids';
import { MemoryPlatform } from '../infra/memory.platform';
import type { TxCtx } from '../infra/types';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class FilesService {
  constructor(private readonly db: MemoryPlatform) {}

  createSession(ctx: TxCtx, input: { mime: string; byteSize: number }) {
    this.db.requireMember(ctx);
    if (!ALLOWED_MIME.has(input.mime)) fail('VALIDATION_FAILED', 'Định dạng tệp không được phép.');
    if (input.byteSize <= 0 || input.byteSize > MAX_BYTES) {
      fail('VALIDATION_FAILED', 'Kích thước tệp không hợp lệ (tối đa 5MB).');
    }
    const id = newId();
    const storageKey = `files/${id}`;
    this.db.files.set(id, {
      id,
      status: 'pending',
      storageKey,
      mime: input.mime,
      byteSize: input.byteSize,
      uploaderId: ctx.actorId,
      workspaceId: ctx.workspaceId,
    });
    return {
      fileId: id,
      storageKey,
      uploadUrl: `/api/v1/files/${id}/binary`,
      expiresInSec: 600,
    };
  }

  finalize(ctx: TxCtx, id: string) {
    const f = must(this.db.files.get(id));
    if (f.uploaderId !== ctx.actorId) fail('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
    f.status = 'ready';
    return f;
  }

  signedUrl(ctx: TxCtx, id: string) {
    const f = must(this.db.files.get(id));
    if (f.uploaderId !== ctx.actorId && f.workspaceId !== ctx.workspaceId) {
      fail('PERMISSION_DENIED', 'Không tìm thấy.', { hideExistence: true });
    }
    return { url: `/api/v1/files/${id}/binary`, expiresInSec: 60 };
  }
}
