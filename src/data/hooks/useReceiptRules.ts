import { useMemo } from 'react';
import type { PricingRule } from '@mambo/core/types';
import { receiptRules } from '../receiptRules';
import { useStore } from '../useStore';
import { useEntitlement } from './useEntitlement';

/** Quy tắc giá phiếu chưa chốt đọc tới — xem `receiptRules.ts`. */
export const useReceiptRules = (): readonly PricingRule[] => {
  const { data } = useStore();
  const paidQuality = useEntitlement('quality:pricing');
  return useMemo(() => receiptRules(data.pricingRules ?? [], paidQuality), [data.pricingRules, paidQuality]);
};
