/**
 * Đưa file ra khỏi app: chia sẻ (Zalo/Messenger) nếu máy hỗ trợ, không thì tải về.
 * Chạm DOM và `navigator` — vì vậy nằm ở `export/`, không nằm ở `core/`.
 */

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 200);
};

/** `copied`: máy không có bảng chia sẻ, nội dung nằm trong clipboard — màn hình phải nói cho người dùng biết. */
export type ShareResult = 'shared' | 'downloaded' | 'copied' | 'cancelled';

/** Người dùng tự đóng bảng chia sẻ — không phải lỗi. */
const isAbort = (err: unknown): boolean => err instanceof DOMException && err.name === 'AbortError';

const share = async (data: ShareData): Promise<ShareResult> => {
  try {
    await navigator.share(data);
    return 'shared';
  } catch (err) {
    if (isAbort(err)) return 'cancelled';
    throw err;
  }
};

export const shareOrDownload = async (
  blob: Blob,
  filename: string,
  title: string,
): Promise<ShareResult> => {
  const file = new File([blob], filename, { type: blob.type });
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) return share({ title, files: [file] });
  downloadBlob(blob, filename);
  return 'downloaded';
};

/** Chia sẻ nội dung chữ (nội dung phiếu) — dùng cho nút "Gửi Zalo". */
export const shareText = async (text: string, title: string): Promise<ShareResult> => {
  if (typeof navigator.share === 'function') return share({ title, text });
  await navigator.clipboard.writeText(text);
  return 'copied';
};
