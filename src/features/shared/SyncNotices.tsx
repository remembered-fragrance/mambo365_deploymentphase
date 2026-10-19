import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useStore } from '@/data/useStore';
import { syncNoticeMessage } from './syncNoticeText';

/**
 * Báo những gì lượt đồng bộ đã làm mà người dùng không tự thấy:
 * - Chủ vừa đổi chi nhánh: app tự bỏ các thay đổi trên phiếu chi nhánh cũ (máy chủ không bao giờ nhận nữa).
 * - Máy chủ nhận thao tác kèm cảnh báo: phiếu / nháp bị gỡ khỏi đơn (đơn đã huỷ, không còn), hay bản ghi đã
 *   bị xoá ở máy khác. Im lặng thì người cân tưởng phiếu đã sửa xong, đơn đã hoàn thành.
 */
export function SyncNotices() {
  const { branchDropped, syncWarnings, data } = useStore();
  const toast = useToast();
  const seenDropped = useRef(branchDropped);
  const seenWarnings = useRef(syncWarnings.length);
  // Tên phiếu lấy theo sổ lúc báo; không báo lại mỗi khi sổ đổi.
  const latest = useRef(data);
  latest.current = data;

  useEffect(() => {
    const dropped = Math.max(0, branchDropped - seenDropped.current);
    const fresh = syncWarnings.slice(seenWarnings.current);
    seenDropped.current = branchDropped;
    seenWarnings.current = syncWarnings.length;
    const message = syncNoticeMessage(dropped, fresh, latest.current);
    if (message) toast({ message, tone: 'alert' });
  }, [branchDropped, syncWarnings, toast]);

  return null;
}
