/**
 * Bốn quy tắc hoà dữ liệu (README C §3.4). Ba trong bốn kịch bản dưới đây đã
 * từng làm mất tiền hoặc làm phiếu sống dậy ở các app cùng loại.
 */

import { describe, expect, it } from 'vitest';
import { mergeChanges } from '@/data/pullChanges';
import { emptyData } from '@/core/normalize';
import type { AppData, Transaction } from '@/core/types';
import type { PartyRow, PaymentRow, TransactionRow } from '@/data/rows';

const USER = '11111111-1111-4111-8111-111111111111';
const TX_ID = 'dddddddd-1111-4111-8111-111111111111';

const BASE = {
  user_id: USER,
  created_at: '2026-08-08T00:00:00.000Z',
  updated_at: '2026-08-08T00:00:00.000Z',
  deleted_at: null,
};

const localTx: Transaction = {
  id: TX_ID,
  date: '2026-08-08T03:00:00.000Z',
  kind: 'purchase',
  counterpartyId: 'aaaaaaaa-1111-4111-8111-111111111111',
  supplierId: 'aaaaaaaa-1111-4111-8111-111111111111',
  supplierName: 'Cô Lê Thị Mai',
  lines: [
    {
      id: 'eeeeeeee-1111-4111-8111-111111111111',
      productName: 'Điều',
      unit: 'kg',
      formulaType: 'standard',
      grossWeight: 1_000,
      pricePerUnit: 10_000,
      rawTotal: 10_000_000,
      roundedTotal: 10_000_000,
    },
  ],
  payments: [{ id: 'pay-may-A', date: '2026-08-09T02:00:00.000Z', amount: 3_000_000 }],
  amountPaid: 3_000_000,
};

const local: AppData = { ...emptyData(), transactions: [localTx] };

const noChanges = {
  suppliers: [],
  buyers: [],
  products: [],
  transactions: [],
  payments: [],
  drafts: [],
  pricingRules: [],
  notes: [],
};

const paymentRow = (id: string, amount: number, deletedAt: string | null = null): PaymentRow => ({
  id,
  transaction_id: TX_ID,
  user_id: USER,
  date: '2026-08-09T02:05:00.000Z',
  amount,
  note: null,
  created_at: '2026-08-09T02:05:00.000Z',
  deleted_at: deletedAt,
});

const txRow = (patch: Partial<TransactionRow> = {}): TransactionRow => ({
  ...BASE,
  id: TX_ID,
  date: localTx.date,
  kind: 'purchase',
  counterparty_id: localTx.counterpartyId,
  supplier_id: localTx.supplierId,
  supplier_name: localTx.supplierName,
  lines: [...localTx.lines],
  credit_terms: null,
  adjustments: null,
  attachment_ids: null,
  note: null,
  payments: [],
  ...patch,
});

describe('tiền không bao giờ bị ghi đè', () => {
  it('máy A ghi trả 3tr khi mất mạng, máy B ghi trả 5tr — cả hai đều còn, tổng 8tr', () => {
    const merged = mergeChanges(
      local,
      { ...noChanges, payments: [paymentRow('pay-may-B', 5_000_000)] },
      new Set(),
    );

    const tx = merged.transactions[0];
    expect(tx?.payments.map((p) => p.id)).toEqual(['pay-may-A', 'pay-may-B']);
    expect(tx?.amountPaid).toBe(8_000_000);
  });

  it('kéo phiếu về KHÔNG làm mất lần trả cục bộ chưa đẩy lên', () => {
    // Bản phiếu từ máy chủ chỉ mang khoản máy chủ biết (5tr). Khoản 3tr ghi
    // lúc mất mạng vẫn phải còn — đây đúng là kịch bản mất tiền mà việc tách
    // bảng payments sinh ra để tránh.
    const merged = mergeChanges(
      local,
      { ...noChanges, transactions: [txRow({ payments: [paymentRow('pay-may-B', 5_000_000)] })] },
      new Set(),
    );
    expect(merged.transactions[0]?.payments.map((p) => p.id)).toEqual(['pay-may-A', 'pay-may-B']);
    expect(merged.transactions[0]?.amountPaid).toBe(8_000_000);
  });

  it('máy chủ báo lần trả đã huỷ thì bỏ, dù bản cục bộ còn giữ', () => {
    const withB: AppData = {
      ...local,
      transactions: [
        {
          ...localTx,
          payments: [
            ...localTx.payments,
            { id: 'pay-may-B', date: '2026-08-09T02:05:00.000Z', amount: 5_000_000 },
          ],
          amountPaid: 8_000_000,
        },
      ],
    };
    const merged = mergeChanges(
      withB,
      {
        ...noChanges,
        transactions: [
          txRow({ payments: [paymentRow('pay-may-B', 5_000_000, '2026-08-10T00:00:00.000Z')] }),
        ],
      },
      new Set(),
    );
    expect(merged.transactions[0]?.amountPaid).toBe(3_000_000);
  });

  it('lần trả bị huỷ (xoá mềm) thì biến mất khỏi sổ', () => {
    const withB: AppData = {
      ...local,
      transactions: [
        {
          ...localTx,
          payments: [...localTx.payments, { id: 'pay-may-B', date: '2026-08-09T02:05:00.000Z', amount: 5_000_000 }],
          amountPaid: 8_000_000,
        },
      ],
    };
    const merged = mergeChanges(
      withB,
      { ...noChanges, payments: [paymentRow('pay-may-B', 5_000_000, '2026-08-10T00:00:00.000Z')] },
      new Set(),
    );
    expect(merged.transactions[0]?.amountPaid).toBe(3_000_000);
  });
});

describe('xoá thắng — phiếu đã xoá không sống dậy', () => {
  it('máy A xoá phiếu, máy B kéo về → phiếu biến mất', () => {
    const merged = mergeChanges(
      local,
      { ...noChanges, transactions: [txRow({ deleted_at: '2026-08-10T00:00:00.000Z' })] },
      new Set(),
    );
    expect(merged.transactions).toEqual([]);
  });
});

describe('bản ghi còn trong hàng đợi thì giữ bản cục bộ', () => {
  it('phiếu đang chờ đẩy không bị bản máy chủ cũ hơn đè lên', () => {
    const merged = mergeChanges(
      local,
      { ...noChanges, transactions: [txRow({ supplier_name: 'Tên cũ trên máy chủ' })] },
      new Set([TX_ID]),
    );
    expect(merged.transactions[0]?.supplierName).toBe('Cô Lê Thị Mai');
  });

  it('phiếu đã xoá trên máy chủ cũng không xoá bản đang chờ đẩy', () => {
    const merged = mergeChanges(
      local,
      { ...noChanges, transactions: [txRow({ deleted_at: '2026-08-10T00:00:00.000Z' })] },
      new Set([TX_ID]),
    );
    expect(merged.transactions).toHaveLength(1);
  });
});

describe('trường vô hướng — ghi sau thắng', () => {
  it('máy chủ đổi tên đối tác thì bản cục bộ theo', () => {
    const merged = mergeChanges(
      local,
      { ...noChanges, transactions: [txRow({ supplier_name: 'Cô Mai (đã sửa)' })] },
      new Set(),
    );
    expect(merged.transactions[0]?.supplierName).toBe('Cô Mai (đã sửa)');
  });

  it('đối tác mới từ máy khác được thêm vào sổ', () => {
    const supplierRow: PartyRow = {
      ...BASE,
      id: 'aaaaaaaa-2222-4111-8111-111111111111',
      name: 'Chú Bảy',
      phone: null,
      location: null,
      note: null,
    };
    const merged = mergeChanges(local, { ...noChanges, suppliers: [supplierRow] }, new Set());
    expect(merged.suppliers.map((s) => s.name)).toEqual(['Chú Bảy']);
  });
});
