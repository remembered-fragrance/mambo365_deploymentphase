import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useStore } from '@/data/useStore';
import { syncNoticeMessage } from './syncNoticeText';

/**
 * Báo những gì lượt đồng bộ đã làm mà người dùng không tự thấy:
 * - Chủ vừa đổi chi nhánh: app tự bỏ các thay đổi trên phiếu chi nhánh cũ (máy chủ không bao giờ nhận nữa).
 *   Toast chỉ đếm; từng phiếu nằm ở `BranchDropCard` (B10).
 * - Ảnh chứng từ bị từ chối hẳn, hay thử mãi không lên (B6).
 * - Máy chủ nhận thao tác kèm cảnh báo: phiếu / nháp bị gỡ khỏi đơn (đơn đã huỷ, không còn), hay bản ghi đã
 *   bị xoá ở máy khác. Im lặng thì người cân tưởng phiếu đã sửa xong, đơn đã hoàn thành.
 */
export function SyncNotices() {
  const { branchDropped, photoAlerts, syncWarnings, data } = useStore();
  const toast = useToast();
  const seenDropped = useRef(branchDropped.length);
  const seenPhotos = useRef(photoAlerts.length);
  const seenWarnings = useRef(syncWarnings.length);
  // Tên phiếu lấy theo sổ lúc báo; không báo lại mỗi khi sổ đổi.
  const latest = useRef(data);
  latest.current = data;

  useEffect(() => {
    // Bấm "Đã ghi lại" làm danh sách rỗng lại: không có gì mới để báo.
    const dropped = Math.max(0, branchDropped.length - seenDropped.current);
    const fresh = syncWarnings.slice(seenWarnings.current);
    const photos = photoAlerts.slice(seenPhotos.current);
    seenDropped.current = branchDropped.length;
    seenWarnings.current = syncWarnings.length;
    seenPhotos.current = photoAlerts.length;
    const message = syncNoticeMessage(dropped, fresh, latest.current, photos);
    if (message) toast({ message, tone: 'alert' });
  }, [branchDropped, photoAlerts, syncWarnings, toast]);

  return null;
}
