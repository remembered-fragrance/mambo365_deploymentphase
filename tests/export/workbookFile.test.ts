import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { readSheetMatrix } from '@/export/workbookFile';

/** Dựng file .xlsx thật trong bộ nhớ bằng đúng các hàm app dùng khi xuất. */
const xlsxFile = (rows: unknown[][], sheet = 'Phieu cu'): File => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows, { cellDates: true }), sheet);
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new File([bytes], 'nhap.xlsx');
};

describe('readSheetMatrix — đọc file Excel người dùng chọn ở màn Nhập dữ liệu', () => {
  it('ghi rồi đọc lại: giữ tiêu đề, chữ có dấu, số, ngày; ô trống là null; bỏ dòng trống', async () => {
    const date = new Date(Date.UTC(2026, 7, 1));
    const matrix = await readSheetMatrix(
      xlsxFile([
        ['Ngày', 'Tên nông hộ', 'Mặt hàng', 'Số lượng', 'Đơn giá', 'Ghi chú'],
        [date, 'Cô Mai', 'Mủ nước', 320, 14500, null],
        [],
        [date, 'Chú Tư Hùng', 'Mủ chén', 12.5, 9800, 'Trả sau'],
      ]),
    );

    expect(matrix).toHaveLength(3);
    expect(matrix[0]).toEqual(['Ngày', 'Tên nông hộ', 'Mặt hàng', 'Số lượng', 'Đơn giá', 'Ghi chú']);
    expect(matrix[1]?.slice(1)).toEqual(['Cô Mai', 'Mủ nước', 320, 14500, null]);
    expect(matrix[2]?.slice(1)).toEqual(['Chú Tư Hùng', 'Mủ chén', 12.5, 9800, 'Trả sau']);
    const cell = matrix[1]?.[0];
    expect(cell).toBeInstanceOf(Date);
    expect((cell as Date).toISOString().slice(0, 10)).toBe('2026-08-01');
  });

  it('chỉ đọc trang tính đầu tiên; file không có dòng nào → mảng rỗng', async () => {
    expect(await readSheetMatrix(xlsxFile([]))).toEqual([]);
  });

  it('file hỏng → báo lỗi, không treo', async () => {
    await expect(readSheetMatrix(new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3])], 'hong.xlsx'))).rejects.toThrow();
  });
});
