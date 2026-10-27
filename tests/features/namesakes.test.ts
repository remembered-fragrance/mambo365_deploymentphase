import { describe, expect, it } from 'vitest';
import type { LinkSummary } from '@mambo/contracts';
import { emptyData } from '@mambo/core/normalize';
import { addTransaction } from '@mambo/core/receiptActions';
import type { AppData, Transaction } from '@mambo/core/types';
import { partyToPatch } from '@/data/wireMappers';
import { partyFromDraft } from '@/features/partners/PartnerFormDialog';
import { linkedPartnerIds } from '@/features/partners/linkState';
import { chipHint, namesakesOf } from '@/features/receipt/namesakes';

const BA = 'aaaaaaaa-1111-4111-8111-111111111111';
const BA_KHAC = 'aaaaaaaa-2222-4222-8222-222222222222';

const book = (): AppData => ({
  ...emptyData(),
  suppliers: [
    { id: BA, name: 'Anh Ba', phone: '0912 000 111' },
    { id: BA_KHAC, name: 'anh ba ', location: 'Ấp 3' },
    { id: 'aaaaaaaa-3333-4333-8333-333333333333', name: 'Anh Ba Lúa' },
  ],
  buyers: [{ id: 'bbbbbbbb-1111-4111-8111-111111111111', name: 'Anh Ba' }],
});

const receipt = (supplierName: string, counterpartyId = ''): Omit<Transaction, 'id'> => ({
  date: '2026-10-19T03:00:00.000Z',
  kind: 'purchase',
  counterpartyId,
  supplierId: counterpartyId,
  supplierName,
  lines: [{ id: 'eeeeeeee-1111-4111-8111-111111111111', productName: 'Điều', unit: 'kg', formulaType: 'standard', grossWeight: 10, pricePerUnit: 1000 }],
  payments: [],
  amountPaid: 0,
});

describe('chip gợi ý người bán trùng tên (B3)', () => {
  it('🔴 hai "Anh Ba": mỗi chip kèm SĐT, không có thì khu vực — tên không trùng thì không kèm gì', () => {
    const all = book().suppliers;
    expect(all.map((p) => chipHint(p, all, undefined))).toEqual(['0912 000 111', 'Ấp 3', undefined]);
  });

  it('không SĐT, không khu vực: kèm ngày phiếu gần nhất', () => {
    const ba = { id: BA, name: 'Anh Ba' };
    const baKhac = { id: BA_KHAC, name: 'Anh Ba' };
    expect(chipHint(ba, [ba, baKhac], '2026-10-19T03:00:00.000Z')).toMatch(/19\/10/);
    expect(chipHint(baKhac, [ba, baKhac], undefined)).toBeUndefined();
  });
});

describe('tên gõ trùng người đã có (B3)', () => {
  it('🔴 gõ đúng tên (khác hoa thường, thừa khoảng trắng) mà chưa chọn: phải hỏi, liệt kê cả hai người trùng', () => {
    const found = namesakesOf(book(), 'purchase', 'ANH BA', undefined);
    expect(found.map((n) => n.party.id)).toEqual([BA, BA_KHAC]);
  });

  it('đã chọn từ gợi ý, tên chưa trùng ai, hay để trống (khách lẻ): không hỏi', () => {
    expect(namesakesOf(book(), 'purchase', 'Anh Ba', BA)).toEqual([]);
    expect(namesakesOf(book(), 'purchase', 'Anh Ba Lu', undefined)).toEqual([]);
    expect(namesakesOf(book(), 'purchase', '  ', undefined)).toEqual([]);
  });

  it('phiếu bán chỉ so với người mua; kèm số phiếu và ngày gần nhất để phân biệt', () => {
    const data = addTransaction(book(), receipt('Anh Ba', BA)).data;
    const [first] = namesakesOf(data, 'purchase', 'Anh Ba', undefined);
    expect(first).toMatchObject({ receipts: 1, lastDate: '2026-10-19T03:00:00.000Z' });
    expect(namesakesOf(data, 'sale', 'anh ba', undefined).map((n) => n.party.id)).toEqual(['bbbbbbbb-1111-4111-8111-111111111111']);
  });

  it('chọn "tạo người mới": phiếu sang hồ sơ thứ hai, công nợ người cũ không đổi', () => {
    const before = book();
    const { data, transaction } = addTransaction(before, receipt('Anh Ba'), { asNew: true });
    expect(data.suppliers).toHaveLength(before.suppliers.length + 1);
    expect([BA, BA_KHAC]).not.toContain(transaction.counterpartyId);
  });

  it('hồ sơ đang kết nối hoặc đã phát mã mời thì không bao giờ gộp theo tên; đã thu hồi thì thôi', () => {
    const link = (id: string, status: LinkSummary['status'], side: LinkSummary['side'] = 'owner') =>
      ({ id: `l-${id}-${status}`, side, status, partner: { id, kind: 'supplier', name: 'x' } }) as unknown as LinkSummary;
    const ids = linkedPartnerIds([link(BA, 'active'), link(BA_KHAC, 'pending'), link('x', 'revoked'), link('y', 'active', 'linked')]);
    expect([...ids].sort()).toEqual([BA, BA_KHAC].sort());
  });
});

describe('sửa đối tác: ô để trống là xoá (B5)', () => {
  it('🔴 xoá SĐT, địa chỉ, ghi chú: lên máy chủ là null — không bị bỏ qua', () => {
    const patch = partyToPatch(partyFromDraft({ id: BA, name: ' Anh Ba ', phone: '  ', location: '', note: '' }));
    expect(patch).toEqual({ name: 'Anh Ba', phone: null, location: null, note: null });
  });
});
