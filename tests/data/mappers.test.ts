/**
 * Round-trip mapper: `fromRow(toRow(x))` phải bằng `x`.
 * Trường bị quên trong mapper không gây lỗi biên dịch — nó biểu hiện thành
 * "mất dữ liệu" sau khi người dùng đồng bộ. Test này là lưới duy nhất bắt được.
 */

import { describe, expect, it } from 'vitest';
import {
  buyerFromRow,
  draftFromRow,
  draftToRow,
  noteFromRow,
  noteToRow,
  partyToRow,
  paymentToRow,
  pricingRuleFromRow,
  pricingRuleToRow,
  productFromRow,
  productToRow,
  supplierFromRow,
  transactionFromRow,
  transactionToRow,
} from '@/data/mappers';
import type { DraftRow, NoteRow, PartyRow, PaymentRow, PricingRuleRow, ProductRow, TransactionRow } from '@/data/rows';
import { GUEST_SUPPLIER_ID } from '@/core/normalizeTransaction';
import type {
  Buyer,
  DraftReceipt,
  Note,
  Payment,
  PricingRule,
  Product,
  Supplier,
  Transaction,
} from '@/core/types';

const USER = '11111111-1111-4111-8111-111111111111';

const BASE = {
  user_id: USER,
  created_at: '2026-08-08T03:00:00.000Z',
  updated_at: '2026-08-08T03:00:00.000Z',
  deleted_at: null,
};

const supplier: Supplier = {
  id: 'aaaaaaaa-1111-4111-8111-111111111111',
  name: 'Cô Lê Thị Mai',
  phone: '+84905112233',
  location: 'Bù Đăng',
  note: 'gọi buổi sáng',
};

const buyer: Buyer = { id: 'bbbbbbbb-1111-4111-8111-111111111111', name: 'Nhà máy Bình Long' };

const product: Product = {
  id: 'cccccccc-1111-4111-8111-111111111111',
  name: 'Cao su',
  unit: 'kg',
  formulaType: 'rubberLatex',
  isSuggested: true,
  isActive: true,
  crop: 'rubber',
  lastPricePerUnit: 14_500,
  group: 'Mủ',
  qualityGrades: ['Loại 1', 'Loại 2'],
  trackInventory: true,
};

const PAYMENT_1: Payment = {
  id: '99999999-1111-4111-8111-111111111111',
  date: '2026-08-08T03:00:00.000Z',
  amount: 600_000,
};
const PAYMENT_2: Payment = {
  id: '88888888-1111-4111-8111-111111111111',
  date: '2026-08-09T03:00:00.000Z',
  amount: 400_000,
  note: 'trả nốt',
};

const transaction: Transaction = {
  id: 'dddddddd-1111-4111-8111-111111111111',
  date: '2026-08-08T03:00:00.000Z',
  kind: 'purchase',
  counterpartyId: supplier.id,
  supplierId: supplier.id,
  supplierName: supplier.name,
  lines: [
    {
      id: 'eeeeeeee-1111-4111-8111-111111111111',
      productName: 'Cao su',
      unit: 'kg',
      formulaType: 'rubberLatex',
      grossWeight: 320,
      qualityPercent: 31,
      pricePerUnit: 14_500,
      rawTotal: 1_438_400,
      roundedTotal: 1_438_000,
    },
  ],
  creditTerms: [{ dueDate: '2026-08-15T03:00:00.000Z', amount: 438_000 }],
  adjustments: [{ id: 'ffffffff-1111-4111-8111-111111111111', kind: 'logistics', label: 'Phí xe', amount: -50_000 }],
  attachmentIds: ['att-1'],
  note: 'trả tiếp cuối tuần',
  payments: [PAYMENT_1, PAYMENT_2],
  amountPaid: 1_000_000,
  syncState: 'synced',
};

const draft: DraftReceipt = {
  id: '77777777-1111-4111-8111-111111111111',
  status: 'waiting',
  kind: 'sale',
  counterpartyId: buyer.id,
  supplierId: buyer.id,
  supplierName: buyer.name,
  lines: transaction.lines,
  amountPaid: 0,
  note: 'chờ xe',
  attachmentIds: ['att-2'],
  createdAt: BASE.created_at,
  updatedAt: BASE.updated_at,
};

const rule: PricingRule = {
  id: '66666666-1111-4111-8111-111111111111',
  name: 'Phí xe đến lấy',
  kind: 'logistics',
  productId: product.id,
  fixedAmount: -50_000,
  percentOfTotal: 1.5,
  minWeightKg: 1_000,
  appliesOnPickup: true,
  active: true,
};

const note: Note = {
  id: '55555555-1111-4111-8111-111111111111',
  body: 'Gọi cô Mai',
  pinned: true,
  done: false,
  createdAt: BASE.created_at,
  updatedAt: BASE.updated_at,
};

describe('round-trip mapper', () => {
  it('người bán', () => {
    const row = { ...BASE, ...partyToRow(supplier, USER) } as PartyRow;
    expect(supplierFromRow(row)).toEqual(supplier);
  });

  it('người mua — trường trống vẫn là undefined, không thành null', () => {
    const row = { ...BASE, ...partyToRow(buyer, USER) } as PartyRow;
    expect(buyerFromRow(row)).toEqual(buyer);
  });

  it('mặt hàng, gồm cả nhóm và danh sách loại hàng', () => {
    const row = { ...BASE, ...productToRow(product, USER) } as ProductRow;
    expect(productFromRow(row)).toEqual(product);
  });

  it('phiếu — payments đến từ bảng riêng, amountPaid tính lại', () => {
    const row = {
      ...BASE,
      ...transactionToRow(transaction, USER),
      payments: transaction.payments.map(
        (p) => ({ ...paymentToRow(p, transaction.id, USER), created_at: BASE.created_at, deleted_at: null }) as PaymentRow,
      ),
    } as TransactionRow;
    expect(transactionFromRow(row)).toEqual(transaction);
  });

  it('nháp, gồm cả chiều giao dịch — thiếu kind là lỗi #4 của bản demo', () => {
    const row = { ...BASE, ...draftToRow(draft, USER) } as DraftRow;
    expect(draftFromRow(row)).toEqual(draft);
  });

  it('quy tắc giá', () => {
    const row = { ...BASE, ...pricingRuleToRow(rule, USER) } as PricingRuleRow;
    expect(pricingRuleFromRow(row)).toEqual(rule);
  });

  it('ghi chú', () => {
    const row = { ...BASE, ...noteToRow(note, USER) } as NoteRow;
    expect(noteFromRow(row)).toEqual(note);
  });
});

describe('mã khách lẻ không xuống database', () => {
  const walkIn: Transaction = {
    ...transaction,
    counterpartyId: GUEST_SUPPLIER_ID,
    supplierId: GUEST_SUPPLIER_ID,
    supplierName: 'Khách lẻ',
  };

  it('ghi xuống thành NULL', () => {
    expect(transactionToRow(walkIn, USER).counterparty_id).toBeNull();
  });

  it('đọc lên lại thành mã khách lẻ', () => {
    const row = {
      ...BASE,
      ...transactionToRow(walkIn, USER),
      payments: [],
    } as unknown as TransactionRow;
    expect(transactionFromRow(row).counterpartyId).toBe(GUEST_SUPPLIER_ID);
  });
});

describe('amountPaid luôn bằng tổng các lần trả', () => {
  it('lần trả đã huỷ (xoá mềm) không được tính', () => {
    const row = {
      ...BASE,
      ...transactionToRow(transaction, USER),
      payments: [
        { ...paymentToRow(PAYMENT_1, transaction.id, USER), created_at: BASE.created_at, deleted_at: null },
        {
          ...paymentToRow(PAYMENT_2, transaction.id, USER),
          created_at: BASE.created_at,
          deleted_at: '2026-08-10T00:00:00.000Z',
        },
      ],
    } as TransactionRow;

    const mapped = transactionFromRow(row);
    expect(mapped.payments).toHaveLength(1);
    expect(mapped.amountPaid).toBe(600_000);
  });
});
