import { useState } from 'react';
import type { AdminResetPasswordInput } from '@mambo/contracts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { adminErrorMessage, resetInput, resetPassword, type ResetDraft } from '@/data/hooks/useAdmin';
import { passwordProblem } from '@/features/shared/password';
import { L } from '@/i18n/labels';

const EMPTY: ResetDraft = { phone: '', newPassword: '', approvedBy: '', reason: '' };

type Errors = Partial<Record<keyof ResetDraft, string>>;

const FIELD_ERROR: Record<keyof ResetDraft, string> = {
  phone: L.adminErrPhone,
  newPassword: L.passwordTooShort,
  approvedBy: L.adminErrApprovedBy,
  reason: L.adminErrReason,
};

/**
 * Đặt lại mật khẩu cho khách (`POST /v1/admin/users/reset-password`) — cho người không tự đặt lại qua email được.
 * Máy chủ từ chối người đã có email khôi phục đã xác nhận; câu từ chối hiện nguyên văn.
 */
export function ResetPasswordCard({ initialPhone = '' }: { readonly initialPhone?: string }) {
  // Bấm "Đặt lại mật khẩu" ở kết quả tìm người: điền sẵn số (nơi dùng đổi `key` để dựng lại form).
  const [form, setForm] = useState({ ...EMPTY, phone: initialPhone });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState<AdminResetPasswordInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  /** Số điện thoại vừa đặt lại xong. */
  const [done, setDone] = useState<string | null>(null);

  const set = (key: keyof ResetDraft) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const ask = () => {
    const checked = resetInput(form);
    // Cùng luật mật khẩu với mọi chỗ đặt mật khẩu khác của app (độ dài, mật khẩu quá phổ biến).
    const problem = passwordProblem(form.newPassword);
    const next: Errors = {
      ...('invalid' in checked ? Object.fromEntries(checked.invalid.map((field) => [field, FIELD_ERROR[field]])) : {}),
      ...(problem ? { newPassword: problem } : {}),
    };
    setErrors(next);
    setFailure(null);
    setDone(null);
    if ('input' in checked && !problem) setPending(checked.input);
  };

  const run = async () => {
    if (!pending) return;
    const input = pending;
    setPending(null);
    setBusy(true);
    try {
      await resetPassword(input);
      setDone(input.phone);
      setForm((f) => ({ ...EMPTY, approvedBy: f.approvedBy }));
    } catch (err) {
      setFailure(adminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={L.adminResetTitle} subtitle={L.adminResetHint}>
      <div className="flex flex-col gap-3">
        <Input
          label={L.adminResetPhone}
          error={errors.phone}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={form.phone}
          onChange={(e) => set('phone')(e.target.value)}
        />
        <Input
          label={L.adminResetNewPassword}
          error={errors.newPassword}
          type="password"
          // Không để trình duyệt điền mật khẩu của chính người quản trị vào đây.
          autoComplete="new-password"
          value={form.newPassword}
          onChange={(e) => set('newPassword')(e.target.value)}
        />
        <Input
          label={L.adminApprovedBy}
          hint={L.adminApprovedByHint}
          error={errors.approvedBy}
          value={form.approvedBy}
          onChange={(e) => set('approvedBy')(e.target.value)}
        />
        <Input
          label={L.adminReason}
          error={errors.reason}
          value={form.reason}
          onChange={(e) => set('reason')(e.target.value)}
        />

        {failure && (
          <p role="alert" className="rounded-xl border border-alert bg-card p-3 text-sm font-medium text-alert">
            {failure}
          </p>
        )}

        <Button tone="danger" size="lg" block disabled={busy} onClick={ask}>
          {busy ? L.loading : L.adminResetSubmit}
        </Button>

        {done && (
          <p role="status" className="rounded-xl border border-brand bg-paper p-3 text-sm text-ink">
            {L.adminResetDonePrefix} <b className="num">{done}</b>. {L.adminResetDoneSuffix}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={L.adminResetConfirmTitle}
        consequence={
          pending
            ? `${L.adminResetConfirmPrefix} ${pending.phone} ${L.adminResetConfirmSuffix} ${L.adminApprovedBy}: ${pending.approvedBy}`
            : ''
        }
        confirmLabel={L.adminResetSubmit}
        onConfirm={() => void run()}
        onCancel={() => setPending(null)}
      />
    </Card>
  );
}
