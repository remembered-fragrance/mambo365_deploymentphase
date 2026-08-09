/**
 * Nén ảnh chứng từ trước khi lưu.
 *
 * Ảnh chụp bằng điện thoại Android tầm trung tầm 3–5MB một tấm; giữ nguyên là
 * đầy bộ nhớ máy sau vài trăm phiếu và tốn 3G khi đẩy lên. Cạnh dài nhất
 * 1600px, JPEG 0,8 — đủ đọc rõ chữ trên phiếu cân giấy.
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

const scaledSize = (width: number, height: number): { width: number; height: number } => {
  const longest = Math.max(width, height);
  if (longest <= MAX_DIMENSION) return { width, height };
  const ratio = MAX_DIMENSION / longest;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
};

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh'));
    };
    img.src = url;
  });

export const compressImage = async (file: File): Promise<Blob> => {
  const img = await loadImage(file);
  const { width, height } = scaledSize(img.width, img.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Máy không dựng được ảnh thu nhỏ');
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Không nén được ảnh'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
};
