/**
 * Permission + workspace membership. CHƯA CHẠY.
 * Quyền đọc DB, không tin header role. Cache TTL ≤ 30s, invalidate khi revoke.
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSION_KEY = 'permission';
export const RequirePermission = (code: string) => SetMetadata(PERMISSION_KEY, code);

export interface AccessService {
  hasPermission(userId: string, workspaceId: string, code: string): Promise<boolean>;
}

@Injectable()
export class WorkspacePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{
      actor?: { userId: string };
      headers: Record<string, string>;
    }>();
    const userId = req.actor?.userId;
    const workspaceId = req.headers['x-workspace-id'];
    const permission =
      this.reflector.get<string>(PERMISSION_KEY, ctx.getHandler()) ?? 'workspaces.read';
    if (!userId || !workspaceId) {
      throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Thiếu workspace.' });
    }
    const ok = await this.access.hasPermission(userId, workspaceId, permission);
    if (!ok) {
      throw new ForbiddenException({
        code: 'WORKSPACE_ACCESS_REVOKED',
        message: 'Không còn quyền trên không gian này.',
      });
    }
    return true;
  }
}
