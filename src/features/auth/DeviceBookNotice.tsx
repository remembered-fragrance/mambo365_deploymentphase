import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useDeviceBook } from '@/data/hooks/useDeviceBook';
import { L } from '@/i18n/labels';

/**
 * "Máy này còn N phiếu ghi lúc chưa đăng nhập — đưa vào tài khoản chứ?"
 *
 * Không tự động nhập: sổ của máy có thể là của người khác mượn máy, và nhập
 * nhầm thì hai sổ trộn vào nhau. Hỏi một câu, người dùng quyết.
 */
export function DeviceBookNotice() {
  const { count, importDeviceBook } = useDeviceBook();
  const toast = useToast();
  const [dismissed, setDismissed] = useState(false);

  if (count === 0 || dismissed) return null;

  return (
    <Card title={L.deviceBookTitle} subtitle={`${count} ${L.receiptCountUnit}`}>
      <p className="text-sm text-ink-2">{L.deviceBookBody}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          tone="primary"
          onClick={() => {
            importDeviceBook();
            setDismissed(true);
            toast({ message: L.deviceBookImported });
          }}
        >
          {L.deviceBookImport}
        </Button>
        <Button onClick={() => setDismissed(true)}>{L.deviceBookDismiss}</Button>
      </div>
    </Card>
  );
}
