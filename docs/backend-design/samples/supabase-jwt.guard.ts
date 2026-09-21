/**
 * NestJS AuthGuard — verify Supabase JWT via JWKS.
 * CHƯA CHẠY. Khớp ADR-002. Không decode bỏ qua chữ ký.
 *
 * HS256 fallback: nếu JWKS rỗng, dùng jwtVerify với secret chỉ trên server
 * HOẶC supabase.auth.getUser(jwt) — không nhét secret vào client.
 */
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

const issuer = process.env.SUPABASE_JWT_ISSUER; // https://<ref>.supabase.co/auth/v1
if (!issuer) throw new Error('SUPABASE_JWT_ISSUER is required');
const JWKS = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

export type Actor = { userId: string; payload: JWTPayload };

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string>; actor?: Actor }>();
    const raw = req.headers.authorization ?? '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
    if (!token) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Thiếu phiên đăng nhập.' });
    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer,
        audience: 'authenticated',
      });
      const userId = payload.sub;
      if (!userId) throw new Error('no sub');
      req.actor = { userId, payload };
      return true;
    } catch {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Phiên không hợp lệ.' });
    }
  }
}
