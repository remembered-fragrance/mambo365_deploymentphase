import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { L } from '@/i18n/labels';
import { HelpButton } from '../help/HelpButton';
import { AccountCard } from './AccountCard';
import { DataCard } from './DataCard';
import { PasswordCard } from './PasswordCard';
import { PreferencesCard } from './PreferencesCard';
import { SupportCard } from './SupportCard';

/**
 * Tài khoản & cài đặt.
 *
 * Thứ tự có chủ ý: hồ sơ trước (thứ hay sửa nhất), dữ liệu ở giữa (thứ quan
 * trọng nhất), đăng xuất cuối cùng (thứ nguy hiểm nhất, để xa tay).
 */
export function ProfilePage() {
  return (
    <PageContainer width="content">
      <PageHeader title={L.navProfile} actions={<HelpButton topic="profile" />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <AccountCard />
        <PreferencesCard />
        <PasswordCard />
        <DataCard />
        <SupportCard />
      </div>
    </PageContainer>
  );
}
