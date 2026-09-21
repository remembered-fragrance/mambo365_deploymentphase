/**
 * Domain errors — mã máy đọc được theo §14.
 */
export const ERROR_CODES = [
  'UNAUTHENTICATED',
  'PERMISSION_DENIED',
  'WORKSPACE_ACCESS_REVOKED',
  'VALIDATION_FAILED',
  'VERSION_CONFLICT',
  'INVALID_STATE_TRANSITION',
  'QUOTE_EXPIRED',
  'INSUFFICIENT_STOCK',
  'IDEMPOTENCY_KEY_REUSED',
  'PLAN_LIMIT_REACHED',
  'RATE_LIMITED',
  'SYNC_CURSOR_EXPIRED',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface FieldError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

const HTTP: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  PERMISSION_DENIED: 403,
  WORKSPACE_ACCESS_REVOKED: 403,
  VALIDATION_FAILED: 400,
  VERSION_CONFLICT: 409,
  INVALID_STATE_TRANSITION: 409,
  QUOTE_EXPIRED: 409,
  INSUFFICIENT_STOCK: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  PLAN_LIMIT_REACHED: 402,
  RATE_LIMITED: 429,
  SYNC_CURSOR_EXPIRED: 409,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors: readonly FieldError[];
  readonly hideExistence: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    opts?: { fieldErrors?: readonly FieldError[]; hideExistence?: boolean; status?: number },
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = opts?.status ?? (opts?.hideExistence ? 404 : HTTP[code]);
    this.fieldErrors = opts?.fieldErrors ?? [];
    this.hideExistence = opts?.hideExistence ?? false;
  }
}

export const fail = (
  code: ErrorCode,
  message: string,
  opts?: { fieldErrors?: readonly FieldError[]; hideExistence?: boolean },
): never => {
  throw new AppError(code, message, opts);
};

export function must<T>(
  value: T | undefined | null,
  message = 'Không tìm thấy.',
  code: ErrorCode = 'PERMISSION_DENIED',
): T {
  if (value === undefined || value === null) {
    throw new AppError(code, message, { hideExistence: code === 'PERMISSION_DENIED' });
  }
  return value;
}
