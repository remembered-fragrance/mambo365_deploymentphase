import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';
import { ClaimCodeCard } from './ClaimCodeCard';

/**
 * Đích của QR kết nối: `/ket-noi?ma=K7M2QX9P`. Chưa đăng nhập thì cổng đăng nhập / "Bạn là ai?"
 * hiện trước mà vẫn giữ nguyên đường dẫn, xong là tới đây. Mọi vỏ đều có (vựa cũng được doanh
 * nghiệp mời). Không tự kết nối khi mở link — người dùng tự bấm.
 */
export function ConnectPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  return (
    <PageContainer width="content">
      <PageHeader title={L.linkClaimTitle} />
      <ClaimCodeCard initialCode={params.get('ma') ?? ''} onClaimed={() => navigate(ROUTES.dashboard)} />
    </PageContainer>
  );
}
