/**
 * Gói Pro Đợt 3 ở app: tỷ lệ tươi / nhân (V24), hợp đồng mùa vụ (V15), bộ hồ sơ kê khai (V17), báo cáo tổng ra
 * Excel (D5), giá thu mua trên bản đồ (V9).
 */

import { describe, expect, it } from 'vitest';
import type { Place, ReportSummary } from '@mambo/contracts';
import { lossFromGreenRatio } from '@mambo/core/calc';
import { emptyData } from '@mambo/core/normalize';
import { TAX_REPORT_DISCLAIMER } from '@mambo/core/taxReport';
import type { AppData, Product, SeasonContract, Transaction } from '@mambo/core/types';
import { forgetRecord } from '@/data/forgetRecord';
import { isScopedOp } from '@/data/localDb';
import { seasonContractFromRecord } from '@/data/recordMappers';
import { mergeChanges } from '@/data/pullChanges';
import { ENTITY_TO_TABLE, TABLE_TO_ENTITY } from '@/data/queue';
import { productToInsert, productToPatch, seasonContractToInsert, seasonContractToPatch, transactionToInsert } from '@/data/wireMappers';
import { orgReportSheet } from '@/export/orgReportXlsx';
import { salesLedgerSheet } from '@/export/purchaseLedgerXlsx';
import { receiptListSheet, taxSummarySheet } from '@/export/taxPackXlsx';
import { contractNote, contractProblem, emptyContract, toContractInput } from '@/features/contracts/contractDraft';
import { placeInput, pricesChanged, type PlaceFormValues } from '@/features/map/PlaceFormSheet';
import { applyProduct, emptyLine, toLine } from '@/features/receipt/lineDraft';
import { L } from '@/i18n/labels';

const freshCoffee: Product = {
  id: 'p-fresh',
  name: 'Cà phê tươi',
  unit: 'kg',
  formulaType: 'lossPercent',
  isSuggested: false,
  isActive: true,
  greenRatio: 4.5,
};

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 'aaaaaaaa-1111-4111-8111-111111111111',
  date: '2026-10-10T03:00:00.000Z',
  supplierId: 's-1',
  supplierName: 'Cô Mai',
  lines: [{ id: 'l-1', productId: 'p-1', productName: 'Cà phê nhân', unit: 'kg', formulaType: 'standard', grossWeight: 100, pricePerUnit: 100_000 }],
  amountPaid: 0,
  kind: 'purchase',
  counterpartyId: 's-1',
  payments: [],
  ...over,
});

const contract = (over: Partial<SeasonContract> = {}): SeasonContract => ({
  id: 'c-1',
  kind: 'purchase',
  counterpartyId: 's-1',
  counterpartyName: 'Cô Mai',
  productId: 'p-1',
  productName: 'Cà phê nhân',
  unit: 'kg',
  quantity: 1_000,
  startDate: '2026-10-01T00:00:00.000+07:00',
  endDate: '2026-12-31T00:00:00.000+07:00',
  closed: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...over,
});

describe('V24 — tỷ lệ tươi / nhân', () => {
  it('chọn mặt hàng có tỷ lệ: dòng mang tỷ lệ, hao hụt suy từ tỷ lệ; 450 kg tươi ra 100 kg nhân', () => {
    const line = toLine({ ...applyProduct(emptyLine(), freshCoffee), gross: '450', price: '120000' });
    expect(line).toMatchObject({ greenRatio: 4.5, lossPercent: lossFromGreenRatio(4.5) });
    expect(transactionToInsert(tx({ lines: [line] })).lines[0]).toMatchObject({ greenRatio: 4.5, roundedTotal: 12_000_000 });
  });

  it('tỷ lệ không hợp lệ (≤ 1) thì như không có: dùng hao hụt gõ tay', () => {
    const line = toLine({ ...applyProduct(emptyLine(), freshCoffee), greenRatio: '1', loss: '5', gross: '100' });
    expect(line.greenRatio).toBeUndefined();
    expect(line.lossPercent).toBe(5);
  });

  it('mặt hàng: gửi tỷ lệ; gỡ là null; dòng không có tỷ lệ gửi lên y như trước', () => {
    expect(productToInsert(freshCoffee).greenRatio).toBe(4.5);
    expect(productToPatch({ greenRatio: undefined })).toEqual({ greenRatio: null });
    expect(transactionToInsert(tx({})).lines[0]).not.toHaveProperty('greenRatio');
  });
});

describe('V15 — hợp đồng mùa vụ đi qua đồng bộ', () => {
  it('bảng ↔ loại bản ghi; hàng đợi nhận op hợp đồng', () => {
    expect(TABLE_TO_ENTITY.season_contracts).toBe('seasonContract');
    expect(ENTITY_TO_TABLE.seasonContract).toBe('season_contracts');
    expect(
      isScopedOp({ orgId: 'o', opId: 'x', id: 'x', entity: 'seasonContract', kind: 'insert', recordId: 'c', seq: 1 }),
    ).toBe(true);
  });

  it('gửi lên: người khách lẻ thành null, giá lẻ làm tròn đồng; sửa chỉ gửi khoá có', () => {
    expect(seasonContractToInsert(contract({ counterpartyId: undefined, pricePerUnit: 98_000.4 }))).toMatchObject({
      counterpartyId: null,
      pricePerUnit: 98_000,
      note: null,
    });
    expect(seasonContractToPatch({ closed: true })).toEqual({ closed: true });
  });

  it('kéo về: hợp nhất vào sổ; máy chủ cũ không có khoá thì giữ nguyên; xoá mềm thì bỏ', () => {
    const record = { ...seasonContractToInsert(contract()), id: 'c-1', counterpartyId: 's-1', createdBy: 'u', createdAt: '', updatedAt: '', deletedAt: null };
    const local: AppData = { ...emptyData(), seasonContracts: [contract({ id: 'c-old' })] };
    const changes = { suppliers: [], buyers: [], products: [], transactions: [], payments: [], drafts: [], pricingRules: [], notes: [] };

    const merged = mergeChanges(local, { ...changes, seasonContracts: [record] } as never, new Set());
    expect(merged.seasonContracts?.map((c) => c.id).sort()).toEqual(['c-1', 'c-old']);
    expect(seasonContractFromRecord(record as never).counterpartyId).toBe('s-1');
    expect(mergeChanges(local, changes, new Set()).seasonContracts).toEqual(local.seasonContracts);
    expect(mergeChanges(local, { ...changes, seasonContracts: [{ ...record, id: 'c-old', deletedAt: 'x' }] } as never, new Set()).seasonContracts).toEqual([]);
    expect(forgetRecord(local, 'seasonContract', 'c-old').seasonContracts).toEqual([]);
  });

  it('form: báo thiếu theo thứ tự ô; người trong sổ lấy tên trong sổ', () => {
    const data: AppData = { ...emptyData(), suppliers: [{ id: 's-1', name: 'Cô Mai' }], products: [{ ...freshCoffee, id: 'p-1', name: 'Cà phê nhân', formulaType: 'standard' }] };
    const draft = emptyContract(new Date(2026, 9, 1));
    expect(contractProblem(draft)).toBe('party');
    const full = { ...draft, partyId: 's-1', productId: 'p-1', quantity: '10.000' };
    expect(contractProblem({ ...full, end: '2026-09-01' })).toBe('period');
    expect(contractProblem(full)).toBeNull();
    expect(toContractInput(full, data)).toMatchObject({ counterpartyName: 'Cô Mai', productName: 'Cà phê nhân', quantity: 10_000, pricePerUnit: undefined });
  });

  it('chốt phiếu thuộc hợp đồng đang mở thì nói đã giao, còn lại (tính cả phiếu vừa chốt)', () => {
    const data: AppData = { ...emptyData(), seasonContracts: [contract()], transactions: [tx({ id: 'old' })] };
    const note = contractNote(data, tx({ id: 'new' }));
    expect(note).toContain('Cô Mai');
    expect(note).toContain('200 kg');
    expect(note).toContain('800 kg');
    expect(contractNote({ ...data, seasonContracts: [contract({ closed: true })] }, tx({ id: 'new' }))).toBe('');
  });
});

describe('V17 — bộ hồ sơ kê khai', () => {
  const range = { from: new Date(2026, 9, 1), to: new Date(2026, 9, 31, 23, 59, 59), label: 'Tháng 10/2026' };
  const data: AppData = {
    ...emptyData(),
    transactions: [
      tx({ attachmentIds: ['a', 'b'] }),
      tx({ id: 'bbbbbbbb-1111-4111-8111-111111111111', kind: 'sale', supplierName: 'Nhà máy X', date: '2026-10-12T03:00:00.000Z' }),
    ],
  };

  it('bảng kê bán ra: câu tự chịu trách nhiệm, cột người mua, chỉ phiếu bán', () => {
    const sheet = salesLedgerSheet(data, range);
    expect(sheet[1]).toEqual([TAX_REPORT_DISCLAIMER]);
    expect(sheet[3]?.[2]).toBe(L.colBuyerName);
    expect(sheet.slice(4, -1).map((r) => r[2])).toEqual(['Nhà máy X']);
  });

  it('tổng hợp: có phiếu bán thì ghi lời; chưa bán gì thì ghi "Chưa có phiếu bán", không ghi số âm', () => {
    const profit = (d: AppData) => taxSummarySheet(d, range).find((r) => r[0] === L.taxGrossProfit)?.[1];
    expect(profit(data)).toBe(0);
    expect(profit({ ...data, transactions: [tx({})] })).toBe(L.taxNoSaleYet);
  });

  it('chứng từ: mỗi phiếu một dòng theo ngày, mã phiếu như biên nhận, số ảnh', () => {
    const rows = receiptListSheet(data, range).slice(1);
    expect(rows.map((r) => [r[2], r[3], r[7]])).toEqual([
      ['AAAAAAAA', L.purchase, 2],
      ['BBBBBBBB', L.sale, 0],
    ]);
  });
});

describe('D5 — báo cáo tổng ra Excel', () => {
  it('mỗi chi nhánh một dòng, dòng cuối là cả doanh nghiệp', () => {
    const side = (amount: number) => ({ count: 1, netWeight: 10, amount, paid: 0, debt: amount });
    const figures = (amount: number) => ({ purchase: side(amount), sale: side(0) });
    const report = {
      from: '',
      to: '',
      totals: figures(300),
      branches: [
        { branch: { id: 'b1', name: 'Chi nhánh 1' }, figures: figures(100) },
        { branch: null, figures: figures(200) },
      ],
    } as unknown as ReportSummary;
    const sheet = orgReportSheet(report, 'Báo cáo');
    expect(sheet.slice(3).map((r) => [r[0], r[3]])).toEqual([
      ['Chi nhánh 1', 100],
      [L.reportNoBranch, 200],
      [L.reportAllBranches, 300],
    ]);
  });
});

describe('V9 — giá thu mua trên điểm bản đồ', () => {
  const values: PlaceFormValues = {
    name: 'Vựa Tư Hùng',
    address: '',
    phone: '',
    description: '',
    prices: [
      { product: 'Tiêu', price: '142000', unit: 'kg' },
      { product: '', price: '', unit: 'kg' },
    ],
  };
  const at = { lat: 11.95, lng: 106.85 };

  it('hết gói thì không gửi khoá prices; có gói thì gửi, dòng trống bỏ qua, gỡ hết là null', () => {
    expect(placeInput(values, at, false)).not.toHaveProperty('prices');
    expect(placeInput(values, at, true).prices).toEqual([{ product: 'Tiêu', price: 142_000, unit: 'kg' }]);
    expect(placeInput({ ...values, prices: [] }, at, true).prices).toBeNull();
  });

  it('sửa tên mà bảng giá y nguyên thì không tính là đổi giá', () => {
    const place = { prices: [{ product: 'Tiêu', price: 142_000, unit: 'kg' }] } as Place;
    expect(pricesChanged({ ...values, name: 'Tên mới' }, place)).toBe(false);
    expect(pricesChanged({ ...values, prices: [{ product: 'Tiêu', price: '143000', unit: 'kg' }] }, place)).toBe(true);
  });
});
