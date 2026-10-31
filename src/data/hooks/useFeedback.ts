/**
 * Góp ý + chấm sao (BE 0.25.0, `POST /v1/feedback`). Máy chủ gắn người và tổ chức từ phiên. Không có hàng đợi
 * offline: mất mạng thì báo, người dùng gửi lại (góp ý không phải tiền — mất thì nhắn Zalo).
 */

import { ApiError } from '@mambo/sdk';
import { APP_VERSION } from '@/config';
import { L } from '@/i18n/labels';
import { api } from '../client';
import { platform } from '../track';

export const sendFeedback = async (rating: number, comment: string): Promise<void> => {
  try {
    await api.feedback.create({ rating, comment, platform: platform(), appVersion: APP_VERSION });
  } catch (err) {
    if (err instanceof TypeError) throw new Error(L.feedbackOffline, { cause: err });
    if (err instanceof ApiError && err.code === 'RATE_LIMITED') throw new Error(L.feedbackRateLimited, { cause: err });
    throw new Error(err instanceof ApiError && err.requestId ? `${L.feedbackFailed} (id: ${err.requestId})` : L.feedbackFailed, { cause: err });
  }
};
