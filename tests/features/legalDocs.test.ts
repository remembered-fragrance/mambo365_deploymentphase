import { describe, expect, it } from 'vitest';
import { FREE_RECEIPTS_PER_MONTH, PLAN_PRICES, REFUND_DAYS, STAFF_PRICE, SUPPORT_ZALO, TRIAL_DAYS } from '@/config';
import { GUIDE } from '@/i18n/legal/guide';
import { vnd, type LegalDoc } from '@/i18n/legal/legalDoc';
import { PRIVACY } from '@/i18n/legal/privacy';
import { TERMS } from '@/i18n/legal/terms';

const textOf = (doc: LegalDoc): string =>
  doc.sections
    .flatMap((s) =>
      s.blocks.flatMap((b) =>
        b.kind === 'list' ? b.items : b.kind === 'table' ? b.rows.flat() : [b.text],
      ),
    )
    .join('\n');

describe('trang pháp lý trong app', () => {
  it.each([TERMS, PRIVACY, GUIDE])('$title: neo mục không trùng, mục nào cũng có nội dung', (doc) => {
    const ids = doc.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of doc.sections) expect(s.blocks.length).toBeGreaterThan(0);
  });

  it('Điều khoản nói đúng giá, dùng thử, hoàn tiền, hạn mức miễn phí trong config', () => {
    const text = textOf(TERMS);
    for (const price of [...Object.values(PLAN_PRICES).flatMap((p) => [p[1], p[12]]), STAFF_PRICE[1], STAFF_PRICE[12]]) {
      expect(text).toContain(vnd(price));
    }
    expect(text).toContain(`${TRIAL_DAYS} ngày`);
    expect(text).toContain(`${REFUND_DAYS} ngày`);
    expect(text).toContain(`${FREE_RECEIPTS_PER_MONTH} phiếu`);
    expect(text).toContain(SUPPORT_ZALO);
  });

  it('Chính sách nêu căn cứ thời hạn theo Nghị định 356 và không bịa thông tin chủ thể', () => {
    const text = textOf(PRIVACY);
    for (const days of ['10 ngày', '15 ngày', '20 ngày', '2 ngày làm việc']) expect(text).toContain(days);
    expect(text).not.toMatch(/ĐIỀN:/);
  });
});
