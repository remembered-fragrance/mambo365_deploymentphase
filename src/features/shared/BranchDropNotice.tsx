import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';

/**
 * Chủ vừa đổi chi nhánh của người này: app tự bỏ các thay đổi trên phiếu chi nhánh cũ (máy chủ không
 * bao giờ nhận nữa). Bỏ thì phải nói — không thì người cân tưởng phiếu đã sửa xong.
 */
export function BranchDropNotice() {
  const { branchDropped } = useStore();
  const toast = useToast();
  const seen = useRef(branchDropped);

  useEffect(() => {
    if (branchDropped <= seen.current) return;
    toast({ message: `${branchDropped - seen.current} ${L.branchOpsDropped}`, tone: 'alert' });
    seen.current = branchDropped;
  }, [branchDropped, toast]);

  return null;
}
