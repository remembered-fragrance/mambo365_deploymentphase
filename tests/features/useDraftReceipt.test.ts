// @vitest-environment jsdom
/**
 * Hook phiếu đang cân: chốt đúng một lần, và giới hạn số khoản cộng / trừ đếm cả khoản theo quy tắc giá.
 * Sổ và quy tắc là giả — chỉ chạy hook thật.
 */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RECEIPT_LIMITS } from '@mambo/contracts';
import { emptyData } from '@mambo/core/normalize';
import type { PricingRule, Transaction } from '@mambo/core/types';

const data = emptyData();
const addTransaction = vi.fn((input: Omit<Transaction, 'id'>) => ({ ...input, id: `tx-${addTransaction.mock.calls.length}` }));
const store = {
  data,
  upsertDraft: vi.fn((d: { id?: string }) => ({ ...d, id: d.id ?? 'draft-1' })),
  deleteDraft: vi.fn(),
  addTransaction,
};
let rules: PricingRule[] = [];
vi.mock('@/data/useStore', () => ({ useStore: () => store }));
vi.mock('@/data/hooks/useReceiptRules', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/hooks/useReceiptRules')>()),
  useReceiptRules: () => rules,
}));

const { useDraftReceipt } = await import('@/features/receipt/useDraftReceipt');
const { L } = await import('@/i18n/labels');
type State = ReturnType<typeof useDraftReceipt>;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let receipt: State;
let root: Root;
function Probe() {
  receipt = useDraftReceipt(undefined, 'purchase');
  return null;
}

const rule = (id: string): PricingRule => ({ id, name: `Phí ${id}`, kind: 'logistics', fixedAmount: -10_000, appliesOnPickup: null, active: true });
const manual = (i: number) => ({ id: `m-${i}`, kind: 'manual' as const, label: `Khoản ${i}`, amount: 1_000 });

const mount = async () => {
  root = createRoot(document.createElement('div'));
  await act(async () => root.render(createElement(Probe)));
  const line = receipt.lines[0]?.id ?? '';
  await act(async () => receipt.updateLine(line, { productName: 'Điều', gross: '100', price: '30000' }));
};

beforeEach(() => {
  rules = [];
  addTransaction.mockClear();
});
afterEach(() => act(() => root.unmount()));

describe('chốt phiếu', () => {
  it('bấm "Trả hết" lần hai (trang còn đang chờ) không ghi thêm phiếu', async () => {
    await mount();
    let first: Transaction | null = null;
    let second: Transaction | null = null;
    await act(async () => {
      first = receipt.finish(3_000_000);
      second = receipt.finish(3_000_000);
    });
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(addTransaction).toHaveBeenCalledTimes(1);
  });
});

describe('tối đa khoản cộng / trừ một phiếu', () => {
  it('khoản tự áp theo quy tắc chiếm chỗ: gõ tay tới đủ thì báo đầy', async () => {
    rules = [rule('a'), rule('b')];
    await mount();
    expect(receipt.ruleAdjustments).toHaveLength(2);
    const typed = Array.from({ length: RECEIPT_LIMITS.adjustments - 3 }, (_, i) => manual(i));
    await act(async () => receipt.setAdjustments(typed));
    expect(receipt.adjustmentsFull).toBe(false);
    await act(async () => receipt.setAdjustments([...typed, manual(99)]));
    expect(receipt.adjustmentsFull).toBe(true);
  });

  it('vượt mức lúc chốt (khoản tự áp tăng sau khi gõ đủ) → báo rõ, phiếu chưa ghi, vẫn chốt lại được', async () => {
    rules = [rule('a')];
    await mount();
    const typed = Array.from({ length: RECEIPT_LIMITS.adjustments }, (_, i) => manual(i));
    await act(async () => receipt.setAdjustments(typed));
    expect(() => receipt.finish(0)).toThrow(L.adjustmentsFull);
    expect(addTransaction).not.toHaveBeenCalled();

    await act(async () => receipt.setAdjustments(typed.slice(1)));
    let tx: Transaction | null = null;
    await act(async () => {
      tx = receipt.finish(0);
    });
    expect(tx).not.toBeNull();
  });
});
