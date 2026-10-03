import { Card } from '@/components/ui/Card';
import type { ImportError, ImportErrorCode } from '@/core/sheetImport';
import { L } from '@/i18n/labels';

const MESSAGE: Record<ImportErrorCode, string> = {
  emptyFile: L.errEmptyFile,
  missingColumn: L.errMissingColumn,
  missingName: L.errMissingName,
  missingProduct: L.errMissingProduct,
  badDate: L.errBadDate,
  badNumber: L.errBadNumber,
};

/** Bao nhiêu lỗi thì đủ để người dùng biết phải làm gì; nhiều hơn chỉ gây nản. */
const SHOW_MAX = 20;

/**
 * Lỗi theo dòng, kèm số dòng ĐÚNG NHƯ TRONG EXCEL.
 *
 * Người dùng sẽ mở file bên cạnh và sửa từng dòng — số dòng lệch một đơn vị vì
 * quên đếm dòng tiêu đề là đủ để họ sửa nhầm dòng và tin rằng app báo sai.
 */
export function ImportErrorList({ errors }: { readonly errors: readonly ImportError[] }) {
  return (
    <Card title={L.importErrorsTitle} subtitle={L.importErrorsHint}>
      <ul className="flex flex-col divide-y divide-rule">
        {errors.slice(0, SHOW_MAX).map((error) => (
          <li
            key={`${error.row}-${error.code}-${error.column ?? ''}`}
            className="flex flex-wrap items-baseline gap-x-2 py-2 text-sm"
          >
            <span className="font-bold text-ink">
              {L.importRow} {error.row}
            </span>
            <span className="text-alert">{MESSAGE[error.code]}</span>
            {error.column && (
              <span className="text-ink-3">
                ({L.importColumn} {error.column})
              </span>
            )}
          </li>
        ))}
      </ul>
      {errors.length > SHOW_MAX && (
        <p className="mt-2 text-sm text-ink-3">
          {errors.length - SHOW_MAX} {L.importMoreErrors}
        </p>
      )}
    </Card>
  );
}
