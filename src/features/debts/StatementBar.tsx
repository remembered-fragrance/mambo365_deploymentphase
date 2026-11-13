import { useState } from 'react';
import type { DebtGroup, DebtSide } from '@mambo/core/debtSelectors';
import { Button } from '@/components/ui/Button';
import { LockIcon, ShareIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { useEntitlement } from '@/data/hooks/useEntitlement';
import { track } from '@/data/hooks/useTrack';
import { L } from '@/i18n/labels';
import { PlanGate } from '../billing/PlanGate';

/** Người dùng đóng bảng chia sẻ — không phải lỗi. */
const cancelled = (err: unknown): boolean => err instanceof DOMException && err.name === 'AbortError';

/**
 * Sao kê công nợ gửi khách (V7, gói Pro) — cuối thẻ công nợ đã mở. Ảnh / PDF sinh ở máy, chia sẻ qua bảng
 * chia sẻ của máy. "Tự gửi Zalo" để khoá kèm nhãn "Sắp có" (§4.5: cần Zalo OA) — bấm thì nói lý do và ghi
 * `locked_feature_viewed` để biết bao nhiêu người muốn.
 */
export function StatementBar({ group, side }: { readonly group: DebtGroup; readonly side: DebtSide }) {
  const paid = useEntitlement('debt:statement');
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [zaloAsked, setZaloAsked] = useState(false);

  if (!paid) {
    return (
      <div className="p-3">
        <PlanGate reason={L.gateStatement} feature="statement" />
      </div>
    );
  }

  const share = async (format: 'png' | 'pdf') => {
    setBusy(true);
    try {
      const { shareStatement } = await import('@/export/debtStatement');
      const result = await shareStatement(group, side, format);
      toast({ message: result === 'shared' ? L.statementShared : L.statementDownloaded });
    } catch (err) {
      if (!cancelled(err)) toast({ message: L.errorTitle, tone: 'alert' });
    } finally {
      setBusy(false);
    }
  };

  const askZalo = () => {
    if (!zaloAsked) track('locked_feature_viewed', { feature: 'zalo_oa' });
    setZaloAsked(true);
  };

  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="text-sm font-semibold text-ink-2">{L.statement}</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void share('png')}>
          <ShareIcon className="h-4 w-4" />
          {L.statementShareImage}
        </Button>
        <Button disabled={busy} onClick={() => void share('pdf')}>
          <ShareIcon className="h-4 w-4" />
          {L.statementSharePdf}
        </Button>
        <Button aria-disabled="true" className="opacity-60" onClick={askZalo}>
          <LockIcon className="h-4 w-4" />
          {L.statementZaloAuto} · {L.comingSoon}
        </Button>
      </div>
      {zaloAsked && <p className="text-sm text-ink-2">{L.zaloOaLocked}</p>}
    </div>
  );
}
