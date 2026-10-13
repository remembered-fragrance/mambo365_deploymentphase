import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useBackend } from '@/data/hooks/useBackend';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';

/**
 * Xoá tài khoản và toàn bộ dữ liệu.
 *
 * 🔴 Không dùng `<ConfirmDialog>` như các thao tác nguy hiểm khác. Bấm "Đồng ý"
 * là việc tay làm được trong nửa giây; ở đây người dùng phải **gõ lại tên vựa
 * của mình**. Đó là thao tác duy nhất trong app không thể làm nhầm.
 *
 * Nút nằm dưới cùng màn Tài khoản, sau thẻ "Dữ liệu của bác" — thứ tự có chủ ý:
 * đường ra khỏi đây đi ngang qua nút "Lưu ra file".
 */
export function DeleteAccountCard() {
  const { user, deleteAccount } = useStore();
  const online = useBackend();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Tên vựa là thứ họ tự gõ vào lúc đăng ký nên nhớ được; không có thì lùi về
  // tên chủ vựa. Không bao giờ lấy chuỗi rỗng — gõ rỗng mà khớp thì hộp xác
  // nhận này thành nút bấm một lần.
  const phrase = user?.businessName?.trim() || user?.name?.trim() || user?.identifier || '';
  const matches = typed.trim().toLowerCase() === phrase.toLowerCase();

  // Chưa cấu hình máy chủ thì không có tài khoản nào để xoá — sổ nằm ở máy này
  // và "Xoá hết" trong thẻ dữ liệu mới là thao tác đúng.
  if (!online || !phrase) return null;

  // Tên hàm cố ý tránh ba từ bị cấm ở §3.7. Một hàm trùng tên với hộp thoại của
  // trình duyệt vừa làm máy kiểm luật báo động, vừa khiến lần sau ai đó tưởng
  // luật đã lỏng ra.
  const wipeAccount = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await deleteAccount();
      setOpen(false);
      toast({ message: L.deleteAccountDone });
    } catch (e) {
      setError(e instanceof Error ? e.message : L.errorTitle);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={L.deleteAccountTitle} subtitle={L.deleteAccountHint}>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-ink-2">{L.deleteAccountSaveFirst}</p>
        <Button tone="danger" block onClick={() => setOpen(true)}>
          {L.deleteAccountButton}
        </Button>
      </div>

      <Dialog
        open={open}
        title={L.deleteAccountTitle}
        description={L.deleteAccountHint}
        onClose={() => setOpen(false)}
      >
        <div className="flex flex-col gap-3">
          <Input
            label={L.deleteAccountTypeName}
            hint={phrase}
            value={typed}
            error={error}
            autoComplete="off"
            onChange={(e) => setTyped(e.target.value)}
          />

          {typed.trim() !== '' && !matches && (
            <p className="text-sm font-medium text-alert">{L.deleteAccountMismatch}</p>
          )}

          <Button
            tone="danger"
            size="lg"
            block
            disabled={!matches || busy}
            onClick={() => void wipeAccount()}
          >
            {busy ? L.deleteAccountWorking : L.deleteAccountButton}
          </Button>
          <Button block onClick={() => setOpen(false)}>
            {L.cancel}
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}
