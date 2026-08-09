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

export type ShareResult = 'shared' | 'downloaded';

export const shareOrDownload = async (
  blob: Blob,
  filename: string,
  title: string,
): Promise<ShareResult> => {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, files: [file] });
    return 'shared';
  }
  downloadBlob(blob, filename);
  return 'downloaded';
};

/** Chia sẻ nội dung chữ (nội dung phiếu) — dùng cho nút "Gửi Zalo". */
export const shareText = async (text: string, title: string): Promise<ShareResult> => {
  if (navigator.share) {
    await navigator.share({ title, text });
    return 'shared';
  }
  await navigator.clipboard.writeText(text);
  return 'downloaded';
};
