/**
 * Sinh id. Dùng `crypto.randomUUID()` — có sẵn ở trình duyệt và Node,
 * không cần thư viện. Fallback cho ngữ cảnh không bảo mật (http trong LAN).
 */

const fallbackUuid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const newId = (prefix: string): string => {
  const uuid =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : fallbackUuid();
  return `${prefix}-${uuid}`;
};
