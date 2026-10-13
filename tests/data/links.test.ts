import { describe, expect, it } from 'vitest';
import { ApiError } from '@mambo/sdk';
import { formatLinkCode, linkErrorMessage } from '@/data/links';
import { L } from '@/i18n/labels';

describe('linkErrorMessage', () => {
  it('mã sai / hết hạn / đã dùng: một câu chung do nơi gọi chọn', () => {
    expect(linkErrorMessage(new ApiError('NOT_FOUND', 404, 'x'), L.linkCodeInvalid)).toBe(L.linkCodeInvalid);
  });

  it('sai hình dạng mã (fields.code)', () => {
    const err = new ApiError('VALIDATION_FAILED', 422, 'x', undefined, { fields: { code: 'sai' } });
    expect(linkErrorMessage(err)).toBe(L.linkCodeShape);
  });

  it('mất mạng: fetch ném TypeError', () => {
    expect(linkErrorMessage(new TypeError('Failed to fetch'))).toBe(L.linkOffline);
  });

  it('lỗi máy chủ: kèm requestId để báo hỗ trợ, không lộ message', () => {
    expect(linkErrorMessage(new ApiError('INTERNAL', 500, 'stack…', 'req-1'))).toBe(`${L.linkFailed} (id: req-1)`);
  });
});

it('formatLinkCode tách hai nhóm bốn ký tự', () => {
  expect(formatLinkCode('K7M2QX9P')).toBe('K7M2-QX9P');
});
