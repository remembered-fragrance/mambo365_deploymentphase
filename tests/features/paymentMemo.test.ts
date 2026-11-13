/**
 * Nội dung chuyển khoản trên màn QR: VietinBank chỉ báo cho SePay khi nội dung bắt đầu bằng SEVQR,
 * còn máy chủ phải dò lại được mã đối soát từ đúng chuỗi ngân hàng ghi.
 */

import { describe, expect, it } from 'vitest';
import { findTransferCode } from '@mambo/core/transferCode';
import { paymentMemo } from '@/features/billing/vietQr';

describe('paymentMemo', () => {
  it('bắt đầu bằng SEVQR và máy chủ vẫn dò ra mã', () => {
    const memo = paymentMemo('T6PGBX');
    expect(memo).toBe('SEVQR TM365 T6PGBX');
    expect(findTransferCode(memo)).toBe('T6PGBX');
    // MoMo chèn mã giao dịch + số điện thoại phía trước — như nội dung VietinBank ghi ngày 27/10.
    expect(findTransferCode(`153810457679-0868512408-${memo}`)).toBe('T6PGBX');
  });
});
