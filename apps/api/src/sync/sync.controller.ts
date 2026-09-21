import type { SyncCommand } from './sync.service';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsISO8601, IsObject, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';
import { CurrentCtx } from '../auth/guards';
import type { TxCtx } from '../infra/types';
import { PgMarketplaceService as MarketplaceService } from '../infra/pg-market';
import { PgOrdersService as OrdersService } from '../infra/pg-trade';
import { PgQuotationsService as QuotationsService } from '../infra/pg-trade';
import { PgReceivingService as ReceivingService } from '../infra/pg-trade';
import { PgSettlementsService as SettlementsService } from '../infra/pg-settlements';
import { PgSyncService as SyncService } from '../infra/pg-sync';

class SyncCommandDto implements SyncCommand {
  @IsUUID() operationId!: string;
  @IsString() @MaxLength(80) type!: string;
  @IsUUID() aggregateId!: string;
  @IsInt() @Min(0) expectedVersion!: number;
  @IsISO8601() clientCreatedAt!: string;
  @IsArray() @ArrayMaxSize(100) @IsUUID(undefined,{each:true}) dependsOn!: string[];
  @IsObject() payload!: Record<string,unknown>;
}
class SyncBatchDto {
  @IsString() @MaxLength(200)
  deviceId!: string;
  @IsUUID()
  workspaceId!: string;
  @IsArray() @ArrayMaxSize(100) @ValidateNested({each:true}) @Type(()=>SyncCommandDto)
  commands!: SyncCommandDto[];
}

@ApiTags('sync')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Workspace-Id', required: true })
@Controller('sync')
export class SyncController {
  constructor(
    private readonly sync: SyncService,
    private readonly market: MarketplaceService,
    private readonly quotes: QuotationsService,
    private readonly orders: OrdersService,
    private readonly receiving: ReceivingService,
    private readonly settlements: SettlementsService,
  ) {}

  @Post('commands')
  commands(@CurrentCtx() ctx: TxCtx, @Body() body: SyncBatchDto) {
    return this.sync.commands(ctx, body, {
      'listing.createDraft': (cmd, c) =>
        this.market.createListing(c, {
          commodityId: String(cmd.payload.commodityId),
          qty: String(cmd.payload.qty),
          harvestLotId: cmd.payload.harvestLotId ? String(cmd.payload.harvestLotId) : undefined,
        }),
      'listing.publish': (cmd, c) => this.market.listingAction(c, cmd.aggregateId, 'published',cmd.expectedVersion),
      'order.confirm': (cmd, c) => this.orders.confirm(c, cmd.aggregateId, cmd.expectedVersion),
      'fulfillment.accept': (cmd, c) =>
        this.receiving.accept(c, cmd.aggregateId, {
          qtyAccepted: String(cmd.payload.qtyAccepted),
          operationId: cmd.operationId,
        }),
      'settlement.declare': (cmd, c) =>
        this.settlements.declare(c, {
          direction: cmd.payload.direction === 'in' ? 'in' : 'out',
          amount: String(cmd.payload.amount),
          valueDate: String(cmd.payload.valueDate),
          operationId: cmd.operationId,
        }),
      'legacy.recordReceipt': async () => {
        throw Object.assign(new Error('legacy adapter P0.2'), { code: 'VALIDATION_FAILED' });
      },
    });
  }

  @Get('changes')
  changes(@CurrentCtx() ctx: TxCtx, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.sync.changes(ctx, cursor, limit ? Number(limit) : 100);
  }

  @Post('bootstrap')
  bootstrap(@CurrentCtx() ctx: TxCtx) {
    return this.sync.bootstrap(ctx);
  }
}

