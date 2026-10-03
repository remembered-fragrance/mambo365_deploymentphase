import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { L } from '@/i18n/labels';
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

/**
 * Tài khoản & cài đặt.
 *
 * Thứ tự có chủ ý: hồ sơ trước (thứ hay sửa nhất), dữ liệu ở giữa (thứ quan
 * trọng nhất), rồi mới tới đăng xuất và xoá tài khoản (hai thứ nguy hiểm nhất,
 * để xa tay). Đường xuống nút xoá đi ngang qua nút "Lưu ra file".
 */
export function ProfilePage() {
  return (
    <PageContainer width="content">
      <PageHeader title={L.navProfile} actions={<HelpButton topic="profile" />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <AccountCard />
        <PlanCard />
        <PreferencesCard />
        <PasswordCard />
        <DataCard />
        <ReferralCard />
        <LegalCard />
        <SupportCard />
        <DeleteAccountCard />
      </div>
    </PageContainer>
  );
}
