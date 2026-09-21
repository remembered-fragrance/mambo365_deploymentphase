import { Body,Controller,Get,Post,Query } from '@nestjs/common';
import { ApiBearerAuth,ApiTags } from '@nestjs/swagger';
import { IsIn,IsObject,IsUUID } from 'class-validator';
import { CurrentCtx } from '../auth/guards';
import type { TxCtx } from '../infra/types';
import { PgLegacyService } from '../infra/pg-legacy';
class LegacyCommandDto {
 @IsUUID() operationId!:string;
 @IsIn(['suppliers','buyers','products','transactions','payments','drafts','pricing_rules','notes']) table!:string;
 @IsIn(['insert','update','softDelete']) kind!:'insert'|'update'|'softDelete';
 @IsUUID() recordId!:string;
 @IsObject() payload!:Record<string,unknown>;
}
@ApiTags('legacy migration')
@ApiBearerAuth()
@Controller('legacy')
export class LegacyController {
 constructor(private readonly legacy:PgLegacyService){}
 @Post('claim') claim(@CurrentCtx() ctx:TxCtx){return this.legacy.claim(ctx);}
 @Post('commands') command(@CurrentCtx() ctx:TxCtx,@Body() body:LegacyCommandDto){return this.legacy.command(ctx,body);}
 @Get('changes') changes(@CurrentCtx() ctx:TxCtx,@Query('cursor') cursor?:string){return this.legacy.changes(ctx,cursor);}
}
