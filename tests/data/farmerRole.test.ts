import { describe, expect, it } from 'vitest';
import { ApiError } from '@mambo/sdk';
import { farmerConnectionError, farmerLinksAvailability } from '@/data/hooks/useFarmerConnections';
import { farmerOrdersAvailability } from '@/data/hooks/useFarmerOrders';
import { ownerRoleLabel, profileTitle } from '@/i18n/profileLabels';

describe('farmer role labels', () => {
  it('shows farmer profile labels instead of trader labels', () => {
    expect(profileTitle('farmer')).toBe('Hồ sơ nông dân');
    expect(profileTitle('farmer')).not.toBe('Hồ sơ vựa');
    expect(ownerRoleLabel('farmer')).toBe('Chủ vườn');
    expect(ownerRoleLabel('farmer')).not.toBe('Chủ vựa');
  });

  it('cho trader và enterprise nhãn hồ sơ đúng loại tổ chức', () => {
    expect(profileTitle('trader')).toBe('Hồ sơ vựa');
    expect(profileTitle('enterprise')).toBe('Hồ sơ doanh nghiệp');
  });
});

describe('farmer links availability and API errors', () => {
  it('keeps links disabled when its feature flag is absent, even with linked:read', () => {
    expect(farmerLinksAvailability('farmer', [], ['linked:read'])).toBe('feature-off');
  });

  it('requires both the links feature and linked:read permission', () => {
    expect(farmerLinksAvailability('farmer', ['links'], [])).toBe('permission-missing');
    expect(farmerLinksAvailability('farmer', ['links'], ['linked:read'])).toBe('available');
  });

  it('preserves API error text and uses a fallback for non-Error failures', () => {
    const apiError = new ApiError('FORBIDDEN', 403, 'Không có quyền xem kết nối');
    expect(farmerConnectionError(apiError, 'Lỗi kết nối')).toBe('Không có quyền xem kết nối');
    expect(farmerConnectionError({ code: 'UNKNOWN' }, 'Không tải được kết nối.'))
      .toBe('Không tải được kết nối.');
  });
});

describe('farmer orders availability', () => {
  it('requires farmer org, orders feature, and at least one order permission', () => {
    expect(farmerOrdersAvailability('farmer', [], ['order:create'])).toBe('feature-off');
    expect(farmerOrdersAvailability('farmer', ['orders'], [])).toBe('permission-missing');
    expect(farmerOrdersAvailability('trader', ['orders'], ['order:create'])).toBe('wrong-org');
    expect(farmerOrdersAvailability('farmer', ['orders'], ['order:create'])).toBe('available');
  });
});
