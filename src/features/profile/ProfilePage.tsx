import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { useStore } from '@/data/useStore';
import { PlanCard } from '../billing/PlanCard';
import { ReferralCard } from '../billing/ReferralCard';
import { HelpButton } from '../help/HelpButton';
import { AccountCard } from './AccountCard';
import { DataCard } from './DataCard';
import { DeleteAccountCard } from './DeleteAccountCard';
import { LegalCard } from './LegalCard';
import { PasswordCard } from './PasswordCard';
import { PreferencesCard } from './PreferencesCard';
import { SupportCard } from './SupportCard';
import { profileTitle } from '@/i18n/profileLabels';
import { useAccountProfile } from '@/data/hooks/useAccountProfile';

/**
 * Tài khoản & cài đặt.
 *
 * Thứ tự có chủ ý: hồ sơ trước (thứ hay sửa nhất), dữ liệu ở giữa (thứ quan
 * trọng nhất), rồi mới tới đăng xuất và xoá tài khoản (hai thứ nguy hiểm nhất,
 * để xa tay). Đường xuống nút xoá đi ngang qua nút "Lưu ra file".
 */
export function ProfilePage() {
  const { orgType } = useStore();
  const account = useAccountProfile();
  return (
    <PageContainer width="content">
      <PageHeader title={profileTitle(orgType)} actions={<HelpButton topic="profile" />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <AccountCard account={account} />
        {orgType !== 'farmer' && <PlanCard />}
        <PreferencesCard />
        <PasswordCard />
        <DataCard />
        <ReferralCard account={account} />
        <LegalCard />
        <SupportCard />
        <DeleteAccountCard />
      </div>
    </PageContainer>
  );
}
