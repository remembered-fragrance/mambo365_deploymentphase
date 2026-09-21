import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { CurrentActor, CurrentCtx } from '../auth/guards';
import type { Actor } from '../auth/jwt';
import type { TxCtx } from '../infra/types';
import { PgIdentityService as IdentityService } from '../infra/pg-identity';

class OnboardingDto {
  @IsIn(['farmer', 'trader', 'enterprise'])
  kind!: 'farmer' | 'trader' | 'enterprise';

  @IsString()
  @MinLength(1)
  displayName!: string;

  @IsOptional()
  @IsString()
  workspaceName?: string;
}

class PatchMeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}

class DeviceDto {
  @IsString()
  deviceId!: string;

  @IsIn(['web', 'android'])
  platform!: 'web' | 'android';

  @IsOptional()
  @IsString()
  appVersion?: string;
}

@ApiTags('me')
@ApiBearerAuth()
@Controller()
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Get('me')
  me(@CurrentActor() actor: Actor) {
    return this.identity.me(actor.userId);
  }

  @Post('me/onboarding')
  onboarding(@CurrentCtx() ctx: TxCtx, @Body() body: OnboardingDto) {
    return this.identity.onboarding(ctx, body);
  }

  @Patch('me')
  patch(@CurrentActor() actor: Actor, @Body() body: PatchMeDto) {
    return this.identity.patchMe(actor.userId, body);
  }

  @Get('me/workspaces')
  async workspaces(@CurrentActor() actor: Actor) {
    return (await this.identity.me(actor.userId)).workspaces;
  }

  @Post('me/workspaces/:id/select')
  select(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.identity.selectWorkspace(ctx, id);
  }

  @Post('me/devices')
  device(@CurrentActor() actor: Actor, @Body() body: DeviceDto) {
    return this.identity.registerDevice(actor.userId, body.deviceId, body.platform);
  }

  @Get('me/devices')
  devices(@CurrentActor() actor: Actor) {
    return this.identity.listDevices(actor.userId);
  }

  @Post('me/devices/:id/revoke')
  revokeDevice(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.identity.revokeDevice(actor.userId, id);
  }

  @Post('me/sessions/revoke-all')
  revokeAll(@CurrentActor() actor: Actor) {
    return this.identity.revokeAllSessions(actor.userId);
  }
}
