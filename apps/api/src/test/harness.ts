import { COMMODITY_IDS } from '../domain/ids';
import { IdentityService } from '../identity/identity.service';
import { MemoryPlatform } from '../infra/memory.platform';
import { LocationsService } from '../locations/locations.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { QuotationsService } from '../quotations/quotations.service';
import { ReceivingService } from '../receiving/receiving.service';
import { SettlementsService } from '../settlements/settlements.service';
import type { TxCtx } from '../infra/types';

export const ctx = (userId: string, workspaceId: string | null = null): TxCtx => ({
  actorId: userId,
  workspaceId,
  requestId: 'test',
});

export const harness = () => {
  const db = new MemoryPlatform();
  return {
    db,
    identity: new IdentityService(db),
    locations: new LocationsService(db),
    market: new MarketplaceService(db),
    quotes: new QuotationsService(db),
    receiving: new ReceivingService(db),
    settlements: new SettlementsService(db),
    rubber: COMMODITY_IDS.rubberLatex,
  };
};

export const onboard = async (
  h: ReturnType<typeof harness>,
  userId: string,
  kind: 'farmer' | 'trader' | 'enterprise',
  name: string,
) => {
  const result = await h.identity.onboarding(ctx(userId), { kind, displayName: name });
  return result;
};
