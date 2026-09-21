import { Body, Controller, Get, Header, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayMaxSize, IsIn, IsISO8601, IsObject, IsArray, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { CurrentCtx } from '../auth/guards';
import type { FormulaType } from '../domain/money';
import type { TxCtx } from '../infra/types';
import { PgInventoryService as InventoryService } from '../infra/pg-market';
import { PgMarketplaceService as MarketplaceService } from '../infra/pg-market';
import { PgOrdersService as OrdersService } from '../infra/pg-trade';
import { PgQuotationsService as QuotationsService } from '../infra/pg-trade';
import { PgReceivingService as ReceivingService } from '../infra/pg-trade';

class FarmDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  addressText?: string;
}

class LotDto {
  @IsUUID()
  commodityId!: string;

  @IsString()
  harvestedQty!: string;
}

class ListingDto {
  @IsUUID()
  commodityId!: string;

  @IsString()
  qty!: string;

  @IsOptional()
  @IsUUID()
  harvestLotId?: string;

  @IsOptional()
  @IsUUID()
  inventoryLotId?: string;

  @IsOptional()
  @IsString()
  desiredPrice?: string;
}

class QuoteLineDto {
  @IsOptional() @IsObject() formulaInputs?: Record<string,string>;
  @IsUUID()
  commodityId!: string;

  @IsString()
  qty!: string;

  @IsString()
  unitPrice!: string;

  @IsOptional()
  @IsIn(['standard','netAfterTare','rubberLatex','lossPercent'])
  formulaType?: FormulaType;
}

class CounterQuoteDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({each:true}) @Type(()=>QuoteLineDto) lines!: QuoteLineDto[];
  @IsOptional() @IsISO8601() expiresAt?: string;
}
class AppointmentDto {
  @IsUUID() orderId!: string;
  @IsUUID() locationId!: string;
  @IsISO8601() proposedAt!: string;
}
class FulfillmentDto {
  @IsString() expectedQty!: string;
  @IsOptional() @IsUUID() orderLineId?: string;
}
class RejectGoodsDto { @IsOptional() @IsString() reason?: string; }
class CreateQuoteDto {
  @IsOptional()
  @IsUUID()
  listingId?: string;

  @IsUUID()
  toWorkspaceId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  lines!: QuoteLineDto[];

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

class AcceptQuoteDto {
  @IsUUID()
  revisionId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedVersion!: number;

  @IsOptional()
  @IsUUID()
  operationId?: string;
}

class VersionDto {
  @Type(() => Number)
  @IsInt()
  expectedVersion!: number;
}

class CloseRemainderDto extends VersionDto { @IsString() reason!: string; }

class WeighDto {
  @IsString()
  grossWeight!: string;

  @IsOptional()
  @IsString()
  tareWeight?: string;

  @IsOptional()
  @IsIn(['standard','netAfterTare','rubberLatex','lossPercent'])
  formulaType?: FormulaType;

  @IsOptional()
  @IsString()
  qualityPercent?: string;
}

class AcceptGoodsDto {
  @IsString()
  qtyAccepted!: string;

  @IsOptional()
  @IsString()
  qtyRejected?: string;

  @IsOptional()
  @IsUUID()
  operationId?: string;
}

@ApiTags('trade')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Workspace-Id', required: true })
@Controller()
export class TradeController {
  constructor(
    private readonly market: MarketplaceService,
    private readonly quotes: QuotationsService,
    private readonly orders: OrdersService,
    private readonly receiving: ReceivingService,
    private readonly inventory: InventoryService,
  ) {}

  @Get('farms')
  farms(@CurrentCtx() ctx: TxCtx) {
    return this.market.listFarms(ctx);
  }

  @Post('farms')
  createFarm(@CurrentCtx() ctx: TxCtx, @Body() body: FarmDto) {
    return this.market.createFarm(ctx, body);
  }

  @Post('farms/:id/lots')
  lot(@CurrentCtx() ctx: TxCtx, @Param('id') id: string, @Body() body: LotDto) {
    return this.market.createLot(ctx, id, body);
  }

  @Post('listings')
  listing(@CurrentCtx() ctx: TxCtx, @Body() body: ListingDto) {
    return this.market.createListing(ctx, body);
  }

  @Post('listings/:id/publish')
  publish(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.market.listingAction(ctx, id, 'published');
  }

  @Post('listings/:id/pause')
  pause(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.market.listingAction(ctx, id, 'paused');
  }

  @Post('listings/:id/close')
  close(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.market.listingAction(ctx, id, 'cancelled');
  }

  @Post('buy-requests')
  buy(@CurrentCtx() ctx: TxCtx, @Body() body: ListingDto) {
    return this.market.createBuyRequest(ctx, body);
  }

  @Get('quotations')
  quotations(@CurrentCtx() ctx: TxCtx) { return this.quotes.list(ctx); }

  @Post('quotations')
  createQuote(@CurrentCtx() ctx: TxCtx, @Body() body: CreateQuoteDto) {
    return this.quotes.create(ctx, body);
  }

  @Post('quotations/:id/send')
  sendQuote(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.quotes.send(ctx, id);
  }

  @Post('quotations/:id/accept')
  acceptQuote(@CurrentCtx() ctx: TxCtx, @Param('id') id: string, @Body() body: AcceptQuoteDto, @Headers('idempotency-key') key?: string) {
    return this.quotes.accept(ctx, id, {
      ...body,
      idempotencyKey: key,
    });
  }

  @Post('quotations/:id/counter')
  counterQuote(
    @CurrentCtx() ctx: TxCtx,
    @Param('id') id: string,
    @Body() body: CounterQuoteDto,
  ) {
    return this.quotes.counter(ctx, id, body);
  }

  @Post('quotations/:id/reject')
  rejectQuote(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.quotes.rejectOrWithdraw(ctx, id, 'rejected');
  }

  @Post('quotations/:id/withdraw')
  withdrawQuote(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.quotes.rejectOrWithdraw(ctx, id, 'withdrawn');
  }

  @Header('Cache-Control', 'private, no-store')
  @Get('orders')
  listOrders(@CurrentCtx() ctx: TxCtx, @Query('role') role?: 'buyer' | 'seller') {
    return this.orders.list(ctx, role);
  }

  @Header('Cache-Control', 'private, no-store')
  @Get('orders/:id')
  getOrder(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.orders.get(ctx, id);
  }

  @Post('orders/:id/confirm')
  confirmOrder(@CurrentCtx() ctx: TxCtx, @Param('id') id: string, @Body() body: VersionDto) {
    return this.orders.confirm(ctx, id, body.expectedVersion);
  }

  @Post('orders/:id/cancel')
  cancelOrder(@CurrentCtx() ctx: TxCtx, @Param('id') id: string, @Body() body: VersionDto) {
    return this.orders.cancel(ctx, id, body.expectedVersion);
  }

  @Post('orders/:id/close-remainder')
  closeRemainder(@CurrentCtx() ctx: TxCtx, @Param('id') id: string, @Body() body: CloseRemainderDto) {
    return this.orders.closeRemainder(ctx, id, body.expectedVersion, body.reason);
  }

  @Post('appointments')
  appointment(
    @CurrentCtx() ctx: TxCtx,
    @Body() body: AppointmentDto,
  ) {
    return this.orders.proposeAppointment(ctx, body);
  }

  @Post('appointments/:id/confirm')
  apptConfirm(@CurrentCtx() ctx: TxCtx, @Param('id') id: string, @Body() body: VersionDto) {
    return this.orders.appointmentAction(ctx, id, 'confirmed', body.expectedVersion);
  }

  @Post('appointments/:id/check-in')
  apptCheckin(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.orders.appointmentAction(ctx, id, 'checked_in');
  }

  @Post('appointments/:id/complete')
  apptComplete(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.orders.appointmentAction(ctx, id, 'completed');
  }

  @Post('appointments/:id/cancel')
  apptCancel(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.orders.appointmentAction(ctx, id, 'cancelled');
  }

  @Post('orders/:id/fulfillments')
  fulfillment(@CurrentCtx() ctx: TxCtx, @Param('id') id: string, @Body() body: FulfillmentDto) {
    return this.receiving.createFulfillment(ctx, id, body);
  }

  @Post('fulfillments/:id/weigh')
  weigh(@CurrentCtx() ctx: TxCtx, @Param('id') id: string, @Body() body: WeighDto) {
    return this.receiving.weigh(ctx, id, body);
  }

  @Post('fulfillments/:id/quality-checks')
  qc(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.receiving.qualityCheck(ctx, id, {});
  }

  @Post('fulfillments/:id/accept')
  acceptGoods(@CurrentCtx() ctx: TxCtx, @Param('id') id: string, @Body() body: AcceptGoodsDto, @Headers('idempotency-key') key?: string) {
    return this.receiving.accept(ctx, id, {...body, operationId: body.operationId ?? key});
  }

  @Post('fulfillments/:id/reject')
  rejectGoods(@CurrentCtx() ctx: TxCtx, @Param('id') id: string, @Body() body: RejectGoodsDto) {
    return this.receiving.reject(ctx, id, body.reason ?? 'rejected');
  }

  @Get('inventory/availability')
  availability(@CurrentCtx() ctx: TxCtx) {
    return this.inventory.availability(ctx);
  }

  @Get('inventory/lots')
  lots(@CurrentCtx() ctx: TxCtx) {
    return this.inventory.lots(ctx);
  }
}
