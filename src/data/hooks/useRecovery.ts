import { useCallback, useEffect, useState } from 'react';
import { api, hasBackend } from '../client';

/** Quên mật khẩu, xác nhận email (BE 0.16.0) — features gọi qua đây, không chạm `data/recovery` thẳng. */
export { confirmRecoveryEmail, requestPasswordReset, sendVerificationMail } from '../recovery';

export interface RecoveryEmailStatus {
  /** `null` = chưa biết (đang hỏi, mất mạng, chưa có email, không có máy chủ) — không hiện gì. */
  readonly verified: boolean | null;
  readonly reload: () => void;
}

/**
 * Email khôi phục đã xác nhận chưa (BE 0.16.0, `MeProfile.recoveryEmailVerified`). Hỏi lại mỗi khi
 * email đã lưu đổi: đổi email là máy chủ bỏ xác nhận cũ và gửi thư cho email mới.
 */
export function useRecoveryEmailStatus(savedEmail: string): RecoveryEmailStatus {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    setVerified(null);
    if (!savedEmail || !hasBackend()) return;
    let live = true;
    api.account
      .profile()
      .then((profile) => {
        if (live) setVerified(profile.recoveryEmail ? profile.recoveryEmailVerified : null);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [savedEmail, round]);

  const reload = useCallback(() => setRound((r) => r + 1), []);
  return { verified, reload };
}
