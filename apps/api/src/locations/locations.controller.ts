import { Body, Controller, Delete, Get, Header, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { CurrentActor, CurrentCtx, Public } from '../auth/guards';
import type { Actor } from '../auth/jwt';
import type { TxCtx } from '../infra/types';
import { PgLocationsService as LocationsService } from '../infra/pg-market';

class NearbyQuery {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  radiusM?: number;

  @IsOptional()
  @IsUUID()
  commodityId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}

class CreateLocationDto {
  @IsString()
  name!: string;

  @IsString()
  addressText!: string;

  @IsOptional()
  @Type(() => Number)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  lng?: number;

  @IsOptional()
  @IsString()
  publicContactName?: string;

  @IsOptional()
  @IsString()
  publicPhone?: string;
}

class PriceQuoteDto {
  @IsUUID()
  commodityId!: string;

  @IsString()
  price!: string;

  @IsString()
  validFrom!: string;

  @IsOptional()
  @IsString()
  validTo?: string;
}

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Public()
  @Header('Cache-Control', 'public, max-age=30')
  @Get('nearby')
  nearby(@Query() query: NearbyQuery) {
    return this.locations.nearby(query);
  }

  @Public()
  @Get('in-bounds')
  inBounds(
    @Query('minLat') minLat: string,
    @Query('minLng') minLng: string,
    @Query('maxLat') maxLat: string,
    @Query('maxLng') maxLng: string,
  ) {
    return this.locations.inBounds({
      minLat: Number(minLat),
      minLng: Number(minLng),
      maxLat: Number(maxLat),
      maxLng: Number(maxLng),
    });
  }

  @Public()
  @Get(':id')
  one(@Param('id') id: string) {
    return this.locations.publicGet(id);
  }

  @ApiBearerAuth()
  @Post()
  create(@CurrentCtx() ctx: TxCtx, @Body() body: CreateLocationDto) {
    return this.locations.create(ctx, body);
  }

  @ApiBearerAuth()
  @Post(':id/submit-review')
  submit(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.locations.submitReview(ctx, id);
  }

  @ApiBearerAuth()
  @Post(':id/price-quotes')
  price(@CurrentCtx() ctx: TxCtx, @Param('id') id: string, @Body() body: PriceQuoteDto) {
    return this.locations.addPriceQuote(ctx, id, body);
  }

  @ApiBearerAuth()
  @Post(':id/follow')
  follow(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.locations.follow(actor.userId, id, true);
  }

  @ApiBearerAuth()
  @Delete(':id/follow')
  unfollow(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.locations.follow(actor.userId, id, false);
  }
}
