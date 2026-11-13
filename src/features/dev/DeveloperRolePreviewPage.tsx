import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OrgType } from '@mambo/contracts';
import { L } from '@/i18n/labels';
import { RoleDashboardPreview } from '@/features/auth/RoleDashboardPreview';

export function DeveloperRolePreviewPage() {
  const [role, setRole] = useState<OrgType>('farmer');
  const navigate = useNavigate();

  return (
    <RoleDashboardPreview
      key={role}
      role={role}
      onRoleChange={setRole}
      onBack={() => navigate('/')}
      backLabel={L.devRolePreviewBack}
    />
  );
}
