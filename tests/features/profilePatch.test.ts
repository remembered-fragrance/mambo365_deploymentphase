import { describe, expect, it } from 'vitest';
import { changedProfileFields } from '@/features/profile/profilePatch';

const saved = { name: 'Hùng', username: 'vuahung', email: 'hung@gmail.com' };

describe('changedProfileFields', () => {
  it('không đổi gì (kể cả khác hoa thường / khoảng trắng) → không gửi gì', () => {
    expect(changedProfileFields(saved, { name: ' Hùng ', username: 'VuaHung', email: 'HUNG@gmail.com ' })).toEqual({});
  });

  it('chỉ sửa tên → chỉ gửi tên, KHÔNG gửi username / email (tránh xoá nhầm)', () => {
    expect(changedProfileFields(saved, { ...saved, name: 'Hùng Vựa' })).toEqual({ name: 'Hùng Vựa' });
  });

  it('người dùng tự xoá email → gửi email rỗng (server hiểu là bỏ email)', () => {
    expect(changedProfileFields(saved, { ...saved, email: '' })).toEqual({ email: '' });
  });

  it('dữ liệu chưa nạp (form trống, bản lưu trống) → không gửi gì', () => {
    const empty = { name: '', username: '', email: '' };
    expect(changedProfileFields(empty, empty)).toEqual({});
  });
});
