import { describe, expect, it } from 'vitest';
import { asksOrgName, emptyFields, orgNameFor } from '@/features/onboarding/setupOrg';
import { L } from '@/i18n/labels';

describe('bước "Bạn là ai?" — tên tổ chức', () => {
  it('chỉ thương lái và doanh nghiệp mới có ô tên tổ chức', () => {
    expect(asksOrgName(null)).toBe(false);
    expect(asksOrgName('farmer')).toBe(false);
    expect(asksOrgName('trader')).toBe(true);
    expect(asksOrgName('enterprise')).toBe(true);
  });

  it('thương lái / doanh nghiệp: gửi đúng tên đã gõ, bỏ khoảng trắng', () => {
    expect(orgNameFor('trader', '  Vựa Tư Hùng ', 'Anh Hùng')).toBe('Vựa Tư Hùng');
    expect(orgNameFor('enterprise', 'Công ty ABC', 'Lan')).toBe('Công ty ABC');
  });

  it('nông dân: tên hộ suy từ tên hiển thị, bỏ qua ô tên tổ chức còn sót', () => {
    expect(orgNameFor('farmer', 'Vựa cũ', ' cô Mai ')).toBe('Hộ cô Mai');
  });

  it('nông dân đã tự gõ "Hộ …" thì không thêm lần nữa', () => {
    expect(orgNameFor('farmer', '', 'Hộ cô Mai')).toBe('Hộ cô Mai');
    expect(orgNameFor('farmer', '', 'hộ ông Tư')).toBe('hộ ông Tư');
    expect(orgNameFor('farmer', '', 'Hộc')).toBe('Hộ Hộc');
  });

  it('nông dân chưa có tên ⇒ rỗng, không tạo hộ tên "Hộ"', () => {
    expect(orgNameFor('farmer', '', '   ')).toBe('');
  });
});

describe('bước "Bạn là ai?" — ô bỏ trống', () => {
  // Để máy chủ bắt thì người dùng đọc câu tiếng Anh của zod ("Too small: expected string…").
  it('vựa / doanh nghiệp bỏ trống tên tổ chức hay tên hiển thị thì báo ngay ở ô đó', () => {
    expect(emptyFields('trader', '  ', 'Khôi')).toEqual({ orgName: L.nameRequired });
    expect(emptyFields('enterprise', 'Công ty ABC', ' ')).toEqual({ name: L.nameRequired });
    expect(emptyFields('trader', '', '')).toEqual({ orgName: L.nameRequired, name: L.nameRequired });
  });

  it('nông dân chỉ cần tên hiển thị', () => {
    expect(emptyFields('farmer', '', 'cô Mai')).toEqual({});
    expect(emptyFields('farmer', '', '')).toEqual({ name: L.nameRequired });
  });

  it('đủ tên thì không báo gì', () => {
    expect(emptyFields('trader', 'Vựa Tư Hùng', 'Anh Hùng')).toEqual({});
  });
});
