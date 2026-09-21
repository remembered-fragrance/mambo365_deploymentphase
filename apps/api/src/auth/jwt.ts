import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { UUID } from '../infra/database';

export interface Actor {
  readonly userId: string;
  readonly payload: JWTPayload;
}

@Injectable()
export class JwtVerifier {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(private readonly config: ConfigService) {
    const issuer = this.config.get<string>('SUPABASE_JWT_ISSUER');
    if (issuer) {
      try {
        this.jwks = createRemoteJWKSet(new URL(`${issuer.replace(/\/$/, '')}/.well-known/jwks.json`));
      } catch {
        this.jwks = null;
      }
    }
  }

  async verify(token: string): Promise<Actor> {
    const issuer = this.config.get<string>('SUPABASE_JWT_ISSUER');
    const audience = this.config.get<string>('SUPABASE_JWT_AUDIENCE') ?? 'authenticated';
    const secret = this.config.get<string>('SUPABASE_JWT_SECRET');

    if (this.jwks && issuer) {
      try {
        const { payload } = await jwtVerify(token, this.jwks, { issuer, audience, algorithms: ['RS256', 'ES256'] });
        return this.actor(payload);
      } catch {
        /* HS256 fallback below */
      }
    }

    if (secret && issuer) {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
        issuer,
        audience,
        algorithms: ['HS256'],
      });
      return this.actor(payload);
    }

    throw new Error('unverified');
  }

  private actor(payload: JWTPayload): Actor {
    const userId = payload.sub;
    if (!userId || !UUID.test(userId) || !payload.exp || !payload.iat || payload.role !== 'authenticated') throw new Error('invalid user claims');
    return { userId, payload };
  }
}
