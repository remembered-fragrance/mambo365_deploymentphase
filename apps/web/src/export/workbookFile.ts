/**
 * Đọc file bảng tính người dùng gửi tới, và ghi ra file mẫu để họ điền.
 *
 * Nằm ở `export/` cùng các file xuất khác vì cùng một lý do: chạm `xlsx` và
 * chạm DOM. Tầng này CHỈ đổi file thành một mảng ô — việc hiểu mảng đó có
 * đúng hay không là của `core/sheetImport.ts`, nơi có test.
 *
 * `cellDates: true` để ô định dạng ngày về đúng kiểu `Date`. Không có nó thì
 * ngày đọc ra là số thứ tự của Excel, và mọi phiếu cũ rơi về năm 1900.
 */

import type { Cell, ImportKind, SheetMatrix } from '@/core/sheetImport';
import { downloadBlob } from './downloadFile';

export const readSheetMatrix = async (file: File): Promise<SheetMatrix> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });

  const first = workbook.SheetNames[0];
  const sheet = first ? workbook.Sheets[first] : undefined;
  if (!sheet) return [];

  return XLSX.utils.sheet_to_json<Cell[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: null,
  });
};

/**
 * File mẫu: một dòng tiêu đề và một dòng ví dụ.
 *
 * Dòng ví dụ quan trọng ngang dòng tiêu đề — "Ngày" không nói cho ai biết phải
 * gõ `01/08/2026` hay `2026-08-01`, còn một dòng đã điền sẵn thì có.
 */
const TEMPLATE: Record<ImportKind, { readonly sheet: string; readonly rows: readonly Cell[][] }> = {
  suppliers: {
    sheet: 'Nong ho',
    rows: [
      ['Tên nông hộ', 'Số điện thoại', 'Khu vực', 'Ghi chú'],
      ['Cô Mai', '0912345678', 'Ấp 3', 'Vườn cao su sau cầu'],
    ],
  },
  receipts: {
    sheet: 'Phieu cu',
    rows: [
      ['Ngày', 'Tên nông hộ', 'Mặt hàng', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Đã trả', 'Ghi chú'],
      ['01/08/2026', 'Cô Mai', 'Mủ nước', 'kg', 320, 14500, 0, ''],
    ],
  },
};

export const downloadImportTemplate = async (kind: ImportKind, filename: string): Promise<void> => {
  const XLSX = await import('xlsx');
  const template = TEMPLATE[kind];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(template.rows as unknown[][]),
    template.sheet,
  );

  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  downloadBlob(
    new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename,
  );
};
