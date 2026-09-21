import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '../domain/errors';
import type { Permission } from '../domain/permissions';
import { Database, personalCtx } from '../infra/database';
import type { TxCtx } from '../infra/types';
import { JwtVerifier, type Actor } from './jwt';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const PERMISSION_KEY = 'permission';
export const RequirePermission = (code: Permission) => SetMetadata(PERMISSION_KEY, code);

export const CurrentActor = createParamDecorator((_d: unknown, ctx: ExecutionContext): Actor => {
  const req = ctx.switchToHttp().getRequest<{ actor?: Actor }>();
  if (!req.actor) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Thiếu phiên đăng nhập.' });
  return req.actor;
});

export const CurrentCtx = createParamDecorator((_d: unknown, ctx: ExecutionContext): TxCtx => {
  const req = ctx.switchToHttp().getRequest<{
    actor?: Actor;
    headers: Record<string, string | undefined>;
    requestId?: string;
  }>();
  if (!req.actor) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Thiếu phiên đăng nhập.' });
  return {
    actorId: req.actor.userId,
    workspaceId: req.headers['x-workspace-id'] ?? null,
    requestId: req.requestId ?? 'unknown',
  };
});

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtVerifier,
    private readonly db: Database,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      actor?: Actor;
    }>();
    const raw = req.headers.authorization ?? '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Thiếu phiên đăng nhập.' });
    }
    try {
      req.actor = await this.jwt.verify(token);
      const actor=req.actor;
      await this.db.run(personalCtx(actor.userId),null,async sql=>{
        const [p]=await sql`select sessions_valid_after from profiles where id=${actor.userId}`;
        if(p?.sessions_valid_after && Number(actor.payload.iat)*1000<=new Date(p.sessions_valid_after).getTime())throw new Error("revoked session");
      });
      return true;
    } catch {
      req.actor = undefined;
      if (isPublic) return true;
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Phiên không hợp lệ.' });
    }
  }
}

@Injectable()
export class WorkspacePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: Database,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.get<Permission>(PERMISSION_KEY, ctx.getHandler());
    if (!permission) return true;
    const req = ctx.switchToHttp().getRequest<{
      actor?: Actor;
      headers: Record<string, string | undefined>;
    }>();
    const userId = req.actor?.userId;
    const workspaceId = req.headers['x-workspace-id'];
    if (!userId || !workspaceId) {
      throw new AppError('PERMISSION_DENIED', 'Thiếu workspace.');
    }
    await this.db.run({ actorId: userId, workspaceId, requestId: 'guard' }, permission, async () => undefined);
    return true;
  }
}
