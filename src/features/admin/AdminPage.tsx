import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAdminFunnel } from '@/data/hooks/useAdmin';
import { useStore } from '@/data/useStore';
import { ROUTES } from '@/features/shared/navItems';
import { L } from '@/i18n/labels';
import { AccessLogTab } from './AccessLogTab';
import { ActivatePlanCard } from './ActivatePlanCard';
import { type AdminSection, AdminShell, isAdminSection } from './AdminShell';
import { FeedbackTab } from './FeedbackTab';
import { OrganizationsTab } from './OrganizationsTab';
import { OverviewTab } from './OverviewTab';
import { PaymentsCard } from './PaymentsCard';
import { PromoTab } from './PromoTab';
import { UsersTab } from './UsersTab';

const DEFAULT_DAYS = 30;

/**
 * `/quan-tri` — trang của người vận hành, khung riêng (`AdminShell`, không có menu sổ của vựa / nông dân), bảy mục:
 * tổng quan, tổ chức, thanh toán (mở gói tay + giao dịch), mã sáng lập, người dùng (tìm + đặt lại mật khẩu), phản hồi,
 * nhật ký quản trị. Mục đang mở nằm trên URL (`?muc=to-chuc`) — tải lại trang hay gửi link vẫn đúng mục.
 *
 * Ai là quản trị do MÁY CHỦ quyết (`ADMIN_USER_IDS`). `me.isAdmin` (0.33.0) chỉ để đưa quản trị viên vào đây; lời gọi
 * phễu (chỉ đọc) vẫn là phép thử: máy chủ từ chối thì cả trang chỉ còn một câu nói rõ vì sao, không bày form nào.
 */
export function AdminPage() {
  const { me, user, signOut } = useStore();
  const [params, setParams] = useSearchParams();
  const raw = params.get('muc');
  const section: AdminSection = isAdminSection(raw) ? raw : 'tong-quan';
  const [days, setDays] = useState(DEFAULT_DAYS);
  // Mở gói từ trang chi tiết tổ chức: mã tổ chức điền sẵn; đổi giá trị là dựng lại form (`key`).
  const [activateTarget, setActivateTarget] = useState('');
  const funnel = useAdminFunnel(days);

  const go = (next: AdminSection) => {
    setParams(next === 'tong-quan' ? {} : { muc: next });
    window.scrollTo({ top: 0 });
  };

  const account = me?.user.name ?? me?.user.phone ?? user?.name ?? '';
  // Tài khoản quản trị không ghi sổ (tổ chức của nó là nông dân — không có sổ), nên hàng đợi chưa gửi nếu có chỉ là
  // thao tác lặt vặt của máy này: đăng xuất không hỏi lần hai.
  const signOutAdmin = () => void signOut().catch(() => signOut({ discardUnsent: true }));

  if (funnel.denied) {
    return (
      <PageContainer width="content">
        <EmptyState
          title={L.adminDeniedTitle}
          description={funnel.denied}
          icon="🔒"
          action={
            <Link to={ROUTES.dashboard} className="inline-flex min-h-11 items-center rounded-xl border border-brand px-4 font-bold text-brand">
              {L.adminBackHome}
            </Link>
          }
        />
      </PageContainer>
    );
  }

  // Chưa có câu trả lời đầu tiên thì chưa bày form. Có rồi thì đổi khoảng ngày không dựng lại form đang gõ dở.
  // API ngủ (Render free) có thể mất ~20 giây — vẫn hiện khung quản trị để không lẫn với màn của app.
  if (!funnel.data && !funnel.error) {
    return (
      <AdminShell section={section} onSectionChange={go} account={account} onSignOut={signOutAdmin}>
        <Skeleton rows={4} label={L.loading} />
      </AdminShell>
    );
  }


  return (
    <AdminShell section={section} onSectionChange={go} account={account} onSignOut={signOutAdmin}>
      {section === 'tong-quan' && <OverviewTab funnel={funnel} days={days} onDaysChange={setDays} />}
      {section === 'to-chuc' && (
        <OrganizationsTab
          onActivate={(id) => {
            setActivateTarget(id);
            go('thanh-toan');
          }}
        />
      )}
      {section === 'thanh-toan' && (
        <div className="flex flex-col gap-4">
          <ActivatePlanCard key={activateTarget} initialTarget={activateTarget} />
          <PaymentsCard />
        </div>
      )}
      {section === 'ma-sang-lap' && <PromoTab />}
      {section === 'nguoi-dung' && <UsersTab />}
      {section === 'phan-hoi' && <FeedbackTab />}
      {section === 'nhat-ky' && <AccessLogTab you={{ id: me?.user.id ?? '', name: account }} />}
    </AdminShell>
  );
}
