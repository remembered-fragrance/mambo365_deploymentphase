import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentCtx } from '../auth/guards';
import type { TxCtx } from '../infra/types';
import { PgSettlementsService as SettlementsService } from '../infra/pg-settlements';

class DeclareDto {
  @IsIn(['in', 'out'])
  direction!: 'in' | 'out';

  @IsString()
  amount!: string;

  @IsString()
  valueDate!: string;

  @IsOptional()
  @IsUUID()
  operationId?: string;
}

class AllocateDto {
  @IsOptional()
  @IsUUID()
  entryId?: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsString()
  amount!: string;

  @IsOptional()
  @IsUUID()
  operationId?: string;
}

class ReverseDto { @IsString() reason!: string; }

@ApiTags('settlements')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Workspace-Id', required: true })
@Controller()
export class SettlementsController {
  constructor(private readonly settlements: SettlementsService) {}

  @Post('settlements')
  declare(@CurrentCtx() ctx: TxCtx, @Body() body: DeclareDto, @Headers('idempotency-key') key?: string) {
    return this.settlements.declare(ctx, {...body,operationId:body.operationId??key});
  }

  @Post('settlements/:id/confirm')
  confirm(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.settlements.confirm(ctx, id);
  }

  @Post('settlements/:id/reject')
  reject(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.settlements.reject(ctx, id);
  }

  @Post('settlements/:id/allocate')
  allocate(@CurrentCtx() ctx: TxCtx, @Param('id') id: string, @Body() body: AllocateDto, @Headers('idempotency-key') key?: string) {
    return this.settlements.allocate(ctx, id, {...body,operationId:body.operationId??key});
  }

  @Post('settlements/:id/reverse')
  reverse(@CurrentCtx() ctx: TxCtx, @Param('id') id: string, @Body() body: ReverseDto) {
    return this.settlements.reverse(ctx, id, body.reason);
  }

  @Get('debts')
  debts(@CurrentCtx() ctx: TxCtx, @Query('filter') filter?: 'due' | 'overdue') {
    return this.settlements.debts(ctx, filter);
  }
}
