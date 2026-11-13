import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { L } from '@/i18n/labels';
import { PlanCard } from '../billing/PlanCard';
import { ReferralCard } from '../billing/ReferralCard';
import { useAccountProfile } from '@/data/hooks/useAccountProfile';
import { HelpButton } from '../help/HelpButton';
import { useAccess } from '../shared/useAccess';
import { allows } from '../shared/access';
import { AccountCard } from './AccountCard';
import { DataCard } from './DataCard';
import { DeleteAccountCard } from './DeleteAccountCard';
import { LegalCard } from './LegalCard';
import { OrgCard } from './OrgCard';
import { PasswordCard } from './PasswordCard';
import { PreferencesCard } from './PreferencesCard';
import { SupportCard } from './SupportCard';

/**
 * Tài khoản & cài đặt.
 *
 * Thứ tự có chủ ý: hồ sơ trước (thứ hay sửa nhất), dữ liệu ở giữa (thứ quan
 * trọng nhất), rồi mới tới đăng xuất và xoá tài khoản (hai thứ nguy hiểm nhất,
 * để xa tay). Đường xuống nút xoá đi ngang qua nút "Lưu ra file".
 */
export function ProfilePage() {
  const access = useAccess();
  const account = useAccountProfile();
  // Gói và sổ trong máy chỉ có ở vỏ có sổ; gói chỉ người được trả tiền (chủ) mới thấy.
  const book = allows(access, { book: true });
  const billing = allows(access, { book: true, permission: 'billing:manage' });
  return (
    <PageContainer width="content">
      <PageHeader title={L.navProfile} actions={<HelpButton topic="profile" />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <AccountCard />
        <OrgCard />
        {billing && <PlanCard />}
        <PreferencesCard />
        <PasswordCard />
        {book && <DataCard />}
        {billing && <ReferralCard account={account} />}
        <LegalCard />
        <SupportCard />
        {access.can('account:delete') && <DeleteAccountCard />}
      </div>
    </PageContainer>
  );
}
