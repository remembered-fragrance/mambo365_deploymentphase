import type { PlaceKind } from '@mambo/contracts';
import { L } from '@/i18n/labels';

export const KIND_LABEL: Readonly<Record<PlaceKind, string>> = {
  trader: L.mapKindTrader,
  enterprise: L.mapKindEnterprise,
};

/** Nền chấm màu theo loại — token `--color-trader` / `--color-enterprise` trong src/index.css. */
export const KIND_BG: Readonly<Record<PlaceKind, string>> = {
  trader: 'bg-trader',
  enterprise: 'bg-enterprise',
};
