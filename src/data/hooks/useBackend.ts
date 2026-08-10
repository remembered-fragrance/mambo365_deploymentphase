/**
 * Có máy chủ để đồng bộ hay đang chạy thuần cục bộ.
 *
 * Màn hình cần biết điều này để nói đúng sự thật với người dùng ("app đang ghi
 * vào máy này") thay vì hiện một form đăng nhập không bao giờ chạy được. Đây
 * là hằng số lúc chạy nên không cần theo dõi thay đổi.
 */

import { hasBackend } from '../client';

export const useBackend = (): boolean => hasBackend();
