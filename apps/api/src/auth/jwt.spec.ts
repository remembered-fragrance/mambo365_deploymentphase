import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { ConfigService } from '@nestjs/config';
import { JwtVerifier } from './jwt';

const secret = 'test-hs256-secret-for-thumua365';

const verifier = () =>
  new JwtVerifier(
    new ConfigService({
      SUPABASE_JWT_ISSUER: 'https://example.supabase.co/auth/v1',
      SUPABASE_JWT_AUDIENCE: 'authenticated',
      SUPABASE_JWT_SECRET: secret,
    }),
  );

describe('JwtVerifier', () => {
  it('rejects garbage token', async () => {
    await expect(verifier().verify('not-a-jwt')).rejects.toThrow();
  });

  it('rejects missing sub', async () => {
    const token = await new SignJWT({ aud: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('https://example.supabase.co/auth/v1')
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(secret));
    await expect(verifier().verify(token)).rejects.toThrow();
  });

  it('accepts HS256 with sub', async () => {
    const token = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('11111111-1111-4111-8111-aaaaaaaaaaaa')
      .setIssuer('https://example.supabase.co/auth/v1')
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(secret));
    const actor = await verifier().verify(token);
    expect(actor.userId).toBe('11111111-1111-4111-8111-aaaaaaaaaaaa');
  });
});
