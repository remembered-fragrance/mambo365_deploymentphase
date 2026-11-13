/**
 * Phiếu rời thanh "Đang cân" — chốt hay xoá đều phải mở đúng khách kế, không mở lại chính nó.
 */

import { describe, expect, it } from 'vitest';
import { discardConsequence, draftHref, nextSession } from '@/features/receipt/draftSessions';
import type { DraftReceipt } from '@mambo/core/types';

const draft = (id: string): DraftReceipt => ({
  id,
  status: 'draft',
  supplierName: '',
  lines: [],
  amountPaid: 0,
  createdAt: '2026-10-14T00:00:00.000Z',
  updatedAt: '2026-10-14T00:00:00.000Z',
});

describe('nextSession', () => {
  it('bỏ qua phiếu đang rời, mở khách kế', () => {
    expect(nextSession([draft('a'), draft('b')], 'a')).toBe('b');
    expect(nextSession([draft('a'), draft('b')], 'b')).toBe('a');
  });

  it('hết khách thì ra phiếu trắng', () => {
    expect(nextSession([draft('a')], 'a')).toBeUndefined();
    expect(nextSession([], undefined)).toBeUndefined();
  });

  it('phiếu chưa lưu lần nào thì khách đầu thanh là khách kế', () => {
    expect(nextSession([draft('a')], undefined)).toBe('a');
  });
});

describe('discardConsequence', () => {
  it('nói tên và số tiền trước khi nói mất hẳn', () => {
    const text = discardConsequence('Cô Mai', 1_250_000);
    expect(text.startsWith('Cô Mai · ')).toBe(true);
    expect(text).toMatch(/1\.250\.000/);
    expect(text).toMatch(/không lấy lại được/);
  });

  it('chưa có tên thì gọi là khách lẻ', () => {
    expect(discardConsequence('  ', 0).startsWith('Khách lẻ · ')).toBe(true);
  });
});

describe('draftHref', () => {
  const params = (href: string) => new URLSearchParams(href.slice(href.indexOf('?')));

  it('nháp phiếu bán mở lại đúng là phiếu bán', () => {
    const href = draftHref({ id: 'b1', kind: 'sale' });
    expect(href.startsWith('/tao-phieu?')).toBe(true);
    expect(params(href).get('kind')).toBe('sale');
    expect(params(href).get('draft')).toBe('b1');
  });

  it('nháp cũ chưa có loại thì là phiếu mua', () => {
    expect(params(draftHref({ id: 'a1' })).get('kind')).toBe('purchase');
  });
});
