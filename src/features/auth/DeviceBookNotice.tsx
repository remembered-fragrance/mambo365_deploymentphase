import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useDeviceBook } from '@/data/hooks/useDeviceBook';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';

/**
 * "Máy này còn N phiếu ghi lúc chưa đăng nhập — đưa vào tài khoản chứ?"
 *
 * Không tự động nhập: sổ của máy có thể là của người khác mượn máy, và nhập
 * nhầm thì hai sổ trộn vào nhau. Hỏi một câu, người dùng quyết.
 */
export function DeviceBookNotice() {
  const { count, importDeviceBook } = useDeviceBook();
  const { importsFromFile } = useStore();
  const toast = useToast();
  const [dismissed, setDismissed] = useState(false);

  // Sổ tổ chức không nhận sổ thay thế từ ngoài (B1): hỏi rồi bấm vào chỉ ra lỗi.
  if (count === 0 || dismissed || !importsFromFile) return null;

  return (
    <Card title={L.deviceBookTitle} subtitle={`${count} ${L.receiptCountUnit}`}>
      <p className="text-sm text-ink-2">{L.deviceBookBody}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          tone="primary"
          onClick={() => {
            try {
              importDeviceBook();
              toast({ message: L.deviceBookImported });
            } catch (err) {
              toast({ message: err instanceof Error ? err.message : String(err), tone: 'alert' });
            }
            setDismissed(true);
          }}
        >
          {L.deviceBookImport}
        </Button>
        <Button onClick={() => setDismissed(true)}>{L.deviceBookDismiss}</Button>
      </div>
    </Card>
  );
}
