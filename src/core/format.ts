const vnd = new Intl.NumberFormat('vi-VN');

export const formatVnd = (n: number): string => `${vnd.format(Math.round(n))}₫`;

export const formatVndShort = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${vnd.format(round(n / 1_000_000_000, 1))} tỷ`;
  if (abs >= 1_000_000) return `${vnd.format(round(n / 1_000_000, 1))}tr`;
  if (abs >= 1_000) return `${vnd.format(round(n / 1_000, 0))}k`;
  return vnd.format(n);
};

export const formatQuantity = (value: number, unit = 'kg'): string =>
  `${vnd.format(round(value, 2))} ${unit}`;

export const formatWeight = (kg: number): string => formatQuantity(kg, 'kg');

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const round = (n: number, digits = 0): number => {
  const f = 10 ** digits;
  return Math.round((n + Number.EPSILON) * f) / f;
};
