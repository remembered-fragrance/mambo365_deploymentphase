/**
 * Hồ sơ của chính người dùng — `GET` / `PATCH /v1/me/profile` (backend ≥ v0.11.0).
 *
 * `@mambo/sdk` v0.4.0 chưa có hai route này nên gọi thẳng, cùng token và cùng
 * định dạng lỗi `{ error: { code, message, details } }` như SDK (ném `ApiError`,
 * `details.fields` = lỗi theo từng ô). Nâng SDK lên v0.11.0 thì thay bằng
 * `api.account.profile()` / `.updateProfile()` và xoá file này.
 */

import type { ErrorCode } from '@mambo/contracts';
import { ApiError } from '@mambo/sdk';
import { getSupabase } from './client';

export interface MeProfile {
  readonly name: string;
  readonly username: string | null;
  readonly phone: string | null;
  readonly recoveryEmail: string | null;
  readonly referralCode: string | null;
  readonly referred: boolean;
}

/** Bỏ trường = không đổi; `null` = xoá. Số điện thoại là khoá đăng nhập — không đổi ở đây. */
export interface MeProfilePatch {
  readonly name?: string;
  readonly username?: string | null;
  readonly recoveryEmail?: string | null;
}

const PATH = '/v1/me/profile';

const baseUrl = (): string => {
  const url = import.meta.env.VITE_API_URL?.trim();
  if (!url) throw new Error('Chưa cấu hình VITE_API_URL');
  return url.replace(/\/+$/, '');
};

const call = async <T>(method: 'GET' | 'PATCH', body?: unknown): Promise<T> => {
  const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
  const res = await fetch(`${baseUrl()}${PATH}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (json as { error?: { code?: string; message?: string; requestId?: string; details?: Record<string, unknown> } } | null)?.error;
    throw new ApiError(
      (error?.code ?? 'INTERNAL') as ErrorCode,
      res.status,
      error?.message ?? `Máy chủ trả ${res.status}`,
      error?.requestId,
      error?.details,
    );
  }
  return json as T;
};

export const getMyProfile = (): Promise<MeProfile> => call<MeProfile>('GET');

export const patchMyProfile = (patch: MeProfilePatch): Promise<MeProfile> => call<MeProfile>('PATCH', patch);
