import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';
import { CurrentCtx, RequirePermission } from '../auth/guards';
import { SYSTEM_ROLE_IDS } from '../domain/ids';
import type { TxCtx } from '../infra/types';
import { PgWorkspacesService as WorkspacesService } from '../infra/pg-identity';

class CreateWorkspaceDto {
  @IsIn(['personal_farm', 'trader', 'enterprise'])
  kind!: 'personal_farm' | 'trader' | 'enterprise';

  @IsString()
  @MinLength(1)
  name!: string;
}

class InviteDto {
  @IsString()
  emailOrPhone!: string;

  @IsString()
  roleId!: string;
}

class AcceptDto {
  @IsString()
  token!: string;
}

class TransferDto {
  @IsString()
  toMembershipId!: string;
}

@ApiTags('workspaces')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Workspace-Id', required: false })
@Controller()
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post('workspaces')
  create(@CurrentCtx() ctx: TxCtx, @Body() body: CreateWorkspaceDto) {
    return this.workspaces.create(ctx, body);
  }

  @Get('workspaces/:id')
  get(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.workspaces.get(ctx, id);
  }

  @Post('workspaces/:id/invitations')
  @RequirePermission('workspaces.invite')
  invite(@CurrentCtx() ctx: TxCtx, @Param('id') id: string, @Body() body: InviteDto) {
    return this.workspaces.invite(ctx, id, body);
  }

  @Post('invitations/:token/accept')
  acceptToken(@CurrentCtx() ctx: TxCtx, @Param('token') token: string) {
    return this.workspaces.accept(ctx, token);
  }

  @Post('invitations/accept')
  acceptBody(@CurrentCtx() ctx: TxCtx, @Body() body: AcceptDto) {
    return this.workspaces.accept(ctx, body.token);
  }

  @Post('memberships/:id/revoke')
  revoke(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.workspaces.revoke(ctx, id);
  }

  @Post('workspaces/:id/transfer-owner')
  transfer(@CurrentCtx() ctx: TxCtx, @Param('id') id: string, @Body() body: TransferDto) {
    return this.workspaces.transferOwner({ ...ctx, workspaceId: id }, id, body.toMembershipId);
  }
}

void SYSTEM_ROLE_IDS;
