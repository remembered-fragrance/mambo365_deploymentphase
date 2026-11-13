import { useMemo } from 'react';
import type { Permission } from '@mambo/contracts';
import { useStore } from '@/data/useStore';
import { can, type Access } from './access';

/** Loại tổ chức + quyền của người đang làm việc, đọc từ `/v1/me` qua store. */
export function useAccess(): Access & { readonly can: (permission: Permission) => boolean } {
  const { orgType, permissions } = useStore();
  return useMemo(() => {
    const access: Access = { orgType, permissions };
    return { ...access, can: (permission: Permission) => can(access, permission) };
  }, [orgType, permissions]);
}
