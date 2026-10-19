import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { downloadBook } from '../shared/bookFile';

/**
 * Lưu sổ ra file và lấy lại từ file.
 *
 * 🔴 Lấy lại từ file THAY toàn bộ sổ đang có, nên phải qua `<ConfirmDialog>`
 * nêu hậu quả — đây đúng là loại thao tác không khôi phục được.
 * Ghi và đọc đều đi qua `useStore`, giao diện không tự chạm nơi lưu trữ.
 */
export function DataCard() {
  // Sổ của tổ chức là sổ của máy chủ — kể cả khi hết gói, đổi máy chỉ cần đăng nhập (B1). Chỉ sổ nằm riêng trên
  // máy mới có nút lấy lại từ file.
  const { data, importData, importsFromFile } = useStore();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<unknown>(null);

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setPending(JSON.parse(text) as unknown);
  };

  const applyFile = () => {
    setPending(null);
    try {
      importData(pending);
      toast({ message: L.importedToast });
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : String(err), tone: 'alert' });
    }
  };

  return (
    <Card title={L.dataTitle} subtitle={L.dataHint}>
      <div className="flex flex-col gap-2">
        <Button tone="primary" block onClick={() => void downloadBook(data)}>
          {L.exportToFile}
        </Button>

        {importsFromFile && (
          <Button block onClick={() => fileInput.current?.click()}>
            {L.importFromFile}
          </Button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="sr-only"
          aria-label={L.importFromFile}
          onChange={(e) => {
            void pickFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        {importsFromFile && <p className="text-sm text-ink-3">{L.importReplaceWarning}</p>}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={L.importFileTitle}
        consequence={`${L.importReplaceWarning} ${data.transactions.length} ${L.receiptCountUnit}.`}
        confirmLabel={L.importFromFile}
        onConfirm={applyFile}
        onCancel={() => setPending(null)}
      />
    </Card>
  );
}
