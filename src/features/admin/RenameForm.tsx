import { useState } from 'react';
import type { AdminRenameResult } from '@mambo/contracts';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { adminErrorMessage } from '@/data/hooks/useAdmin';
import { L } from '@/i18n/labels';

interface Props {
  /** Tên đang lưu — điền sẵn vào ô và nói trong hộp xác nhận. */
  readonly current: string;
  /** Giới hạn của máy chủ: tên tài khoản 80, tên tổ chức 120. */
  readonly maxLength: number;
  readonly label: string;
  readonly save: (input: { readonly name: string; readonly approvedBy: string; readonly reason?: string }) => Promise<AdminRenameResult>;
  readonly onRenamed: (name: string) => void;
}

interface Errors {
  readonly name?: string;
  readonly approvedBy?: string;
  readonly reason?: string;
}

/** Ô bị sai, theo cùng giới hạn của máy chủ. Rỗng = gửi được. */
export const renameErrors = (draft: { name: string; approvedBy: string; reason: string }, maxLength: number): Errors => {
  const name = draft.name.trim();
  const approvedBy = draft.approvedBy.trim();
  return {
    ...(name.length < 1 || name.length > maxLength ? { name: `${L.adminErrRenameName} ${maxLength} ${L.adminErrRenameChars}` } : {}),
    ...(approvedBy.length < 2 || approvedBy.length > 80 ? { approvedBy: L.adminErrApprovedBy } : {}),
    ...(draft.reason.trim().length > 300 ? { reason: L.adminErrReason } : {}),
  };
};

/**
 * Quản trị viên sửa tên (API 0.34.0): mở bằng nút "Sửa tên", cần người duyệt, qua hộp xác nhận ghi rõ tên cũ → tên mới rồi
 * mới gọi. Máy chủ ghi nhật ký quản trị (và nhật ký của tổ chức khi sửa tên tổ chức).
 */
export function RenameForm({ current, maxLength, label, save, onRenamed }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(current);
  const [approvedBy, setApprovedBy] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const ask = () => {
    const found = renameErrors({ name, approvedBy, reason }, maxLength);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length === 0) setAsking(true);
  };

  const run = async () => {
    setAsking(false);
    setBusy(true);
    try {
      const r = await save({ name: name.trim(), approvedBy: approvedBy.trim(), ...(reason.trim() ? { reason: reason.trim() } : {}) });
      onRenamed(r.name);
      setDone(`${L.adminRenamed}: "${r.previousName}" → "${r.name}"`);
      setOpen(false);
    } catch (err) {
      setFailure(adminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => {
            setName(current);
            setDone(null);
            setOpen(true);
          }}
        >
          {L.adminRename}
        </Button>
        {done && (
          <p role="status" className="text-sm font-medium text-brand">
            {done}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-rule bg-paper p-3"
      onSubmit={(e) => {
        e.preventDefault();
        ask();
      }}
    >
      <Input label={label} value={name} maxLength={maxLength} error={errors.name} autoFocus onChange={(e) => setName(e.target.value)} />
      <Input
        label={L.adminApprovedBy}
        hint={L.adminApprovedByHint}
        value={approvedBy}
        maxLength={80}
        error={errors.approvedBy}
        onChange={(e) => setApprovedBy(e.target.value)}
      />
      <Input label={L.adminReason} value={reason} maxLength={300} error={errors.reason} onChange={(e) => setReason(e.target.value)} />
      {failure && (
        <p role="alert" className="text-sm font-medium text-alert">
          {failure}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" tone="primary" disabled={busy}>
          {busy ? L.loading : L.save}
        </Button>
        <Button onClick={() => setOpen(false)} disabled={busy}>
          {L.cancel}
        </Button>
      </div>
      <ConfirmDialog
        open={asking}
        title={L.adminRenameConfirmTitle}
        consequence={`"${current}" → "${name.trim()}"`}
        confirmLabel={L.adminRename}
        onConfirm={() => void run()}
        onCancel={() => setAsking(false)}
      />
    </form>
  );
}
