import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { downloadBook } from './bookFile';

/**
 * B8: chủ đã gỡ người này khỏi một tổ chức mà máy còn sổ. Không còn gì chưa gửi thì sổ đã dọn sẵn, chỉ báo. Còn
 * thì giữ sổ tới khi người dùng xuất file rồi bấm dọn — op đó máy chủ không nhận nữa, nhưng có thể là tiền thật.
 * Đóng hộp mà chưa dọn thì lần mở app sau hỏi lại.
 */
export function LeftOrgsDialog() {
  const { leftOrgs, readLeftOrgBook, wipeLeftOrg, dismissLeftOrg } = useStore();
  const toast = useToast();
  const [exported, setExported] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const org = leftOrgs[0];
  if (!org) return null;

  const exportBook = async () => {
    const book = await readLeftOrgBook(org.id);
    if (!book) return;
    await downloadBook(book);
    setExported(org.id);
  };
  const wipe = () => {
    setConfirmWipe(false);
    wipeLeftOrg(org.id).catch((error: unknown) => {
      toast({ message: error instanceof Error ? error.message : L.localSaveFailed, tone: 'alert' });
    });
  };

  return (
    <Dialog open title={`${L.leftOrgTitle} ${org.name}`} onClose={() => dismissLeftOrg(org.id)}>
      {org.unsent === 0 ? (
        <>
          <p className="text-ink-2">{L.leftOrgWiped}</p>
          <Button className="mt-4" tone="primary" onClick={() => dismissLeftOrg(org.id)}>{L.leftOrgOk}</Button>
        </>
      ) : (
        <>
          <p className="text-ink-2">
            <span className="num font-semibold text-alert">{org.unsent}</span> {L.leftOrgUnsent}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button tone="primary" onClick={() => void exportBook()}>{L.leftOrgExport}</Button>
            <Button tone="danger" onClick={() => (exported === org.id ? wipe() : setConfirmWipe(true))}>{L.leftOrgWipe}</Button>
          </div>
          <ConfirmDialog
            open={confirmWipe}
            title={L.leftOrgWipeTitle}
            consequence={L.leftOrgWipeConsequence}
            confirmLabel={L.leftOrgWipe}
            onConfirm={wipe}
            onCancel={() => setConfirmWipe(false)}
          />
        </>
      )}
    </Dialog>
  );
}
