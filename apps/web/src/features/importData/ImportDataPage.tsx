import { useRef, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { parseReceipts, parseSuppliers } from '@/core/sheetImport';
import type { ImportError, ImportKind, ReceiptImport, SupplierImport } from '@/core/sheetImport';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { ImportErrorList } from './ImportErrorList';
import { ImportPreview } from './ImportPreview';

type Parsed =
  | { readonly kind: 'suppliers'; readonly rows: readonly SupplierImport[] }
  | { readonly kind: 'receipts'; readonly rows: readonly ReceiptImport[] };

const TEMPLATE_FILE: Record<ImportKind, string> = {
  suppliers: 'thumua365-mau-nong-ho.xlsx',
  receipts: 'thumua365-mau-phieu-cu.xlsx',
};

/**
 * Nhập danh sách nông hộ và phiếu cũ từ file Excel.
 *
 * 🔴 Ba thứ bắt buộc, thiếu một là hỏng cả dịch vụ chuyển dữ liệu:
 *   1. Tải được file mẫu — không ai đoán được app muốn cột nào.
 *   2. Xem trước rồi mới nhập — file của người khác gửi thì phải nhìn đã.
 *   3. Sai thì báo THEO DÒNG và KHÔNG nhập gì cả. Nhập được 700 dòng rồi hỏng
 *      ở dòng 701 là trạng thái không ai gỡ được: chạy lại thì trùng, bỏ thì thiếu.
 */
export function ImportDataPage() {
  const { importSuppliers, importReceipts } = useStore();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<ImportKind>('suppliers');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [errors, setErrors] = useState<readonly ImportError[]>([]);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setParsed(null);
    setErrors([]);
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    reset();
    try {
      const { readSheetMatrix } = await import('@/export/workbookFile');
      const matrix = await readSheetMatrix(file);
      const result = kind === 'suppliers' ? parseSuppliers(matrix) : parseReceipts(matrix);

      if (!result.ok) setErrors(result.errors);
      else if (kind === 'suppliers')
        setParsed({ kind, rows: result.items as readonly SupplierImport[] });
      else setParsed({ kind, rows: result.items as readonly ReceiptImport[] });
    } catch {
      setErrors([{ row: 1, code: 'emptyFile' }]);
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!parsed) return;
    const added =
      parsed.kind === 'suppliers' ? importSuppliers(parsed.rows) : importReceipts(parsed.rows);
    reset();
    toast({ message: `${L.importDone}: ${added}` });
  };

  const downloadTemplate = async () => {
    const { downloadImportTemplate } = await import('@/export/workbookFile');
    await downloadImportTemplate(kind, TEMPLATE_FILE[kind]);
  };

  return (
    <PageContainer width="content">
      <PageHeader title={L.importTitle} subtitle={L.importSubtitle} />

      <div className="flex flex-col gap-4">
        <Card title={L.importTitle}>
          <div className="flex flex-col gap-3">
            <Segmented
              label={L.importTitle}
              value={kind}
              options={[
                { value: 'suppliers', label: L.importKindSuppliers },
                { value: 'receipts', label: L.importKindReceipts },
              ]}
              onValueChange={(next) => {
                setKind(next === 'receipts' ? 'receipts' : 'suppliers');
                reset();
              }}
            />

            <Button block onClick={() => void downloadTemplate()}>
              {L.importTemplate}
            </Button>

            <Button tone="primary" block disabled={busy} onClick={() => fileInput.current?.click()}>
              {busy ? L.loading : L.importPick}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              aria-label={L.importPick}
              onChange={(e) => {
                void pickFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        </Card>

        {errors.length > 0 && <ImportErrorList errors={errors} />}

        {parsed && (
          <Card title={L.importPreviewTitle} subtitle={`${parsed.rows.length} ${L.importRowsFound}`}>
            <div className="flex flex-col gap-3">
              <ImportPreview parsed={parsed} />
              <Button tone="primary" size="lg" block onClick={apply}>
                {L.importConfirm}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
