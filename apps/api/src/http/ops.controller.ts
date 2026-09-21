import { requireWorkspace } from '../infra/database';
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentActor, CurrentCtx } from '../auth/guards';
import type { Actor } from '../auth/jwt';
import type { TxCtx } from '../infra/types';
import { PgAccountService as AccountService } from '../infra/pg-ops';
import { PgBillingService as BillingService } from '../infra/pg-ops';
import { PgFilesService as FilesService } from '../infra/pg-ops';
import { PgLocationsService as LocationsService } from '../infra/pg-market';
import { Database, camel, personalCtx } from '../infra/database';
import { fail } from '../domain/errors';
import { PgNotificationsService as NotificationsService } from '../infra/pg-ops';

@ApiTags('account')
@ApiBearerAuth()
@Controller()
export class OpsController {
  constructor(
    private readonly account: AccountService,
    private readonly files: FilesService,
    private readonly notifications: NotificationsService,
    private readonly billing: BillingService,
    private readonly locations: LocationsService,
    private readonly db: Database,
  ) {}

  @Post('account/deletion-requests')
  deletion(@CurrentCtx() ctx: TxCtx) {
    return this.account.requestDeletion(ctx);
  }

  @Get('account/deletion-requests/:id')
  getDeletion(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.account.getDeletion(ctx, id);
  }

  @Post('account/export')
  exportMine(@CurrentCtx() ctx: TxCtx) {
    return this.account.exportMine(ctx);
  }

  @Post('files/upload-sessions')
  upload(@CurrentCtx() ctx: TxCtx, @Body() body: { mime: string; byteSize: number }) {
    return this.files.createSession(ctx, body);
  }

  @Post('files/:id/finalize')
  finalize(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.files.finalize(ctx, id);
  }

  @Get('files/:id/url')
  url(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.files.signedUrl(ctx, id);
  }

  @Get('notifications')
  inbox(@CurrentActor() actor: Actor) {
    return this.notifications.list(actor.userId);
  }

  @Post('notifications/:id/read')
  read(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.notifications.read(actor.userId, id);
  }

  @Patch('notification-preferences')
  prefs(@CurrentActor() actor: Actor, @Body() body: { quietHours?: unknown }) {
    return this.db.run(personalCtx(actor.userId),null,async sql=>{
      await sql`insert into notification_preferences(user_id,quiet_hours) values(${actor.userId},${sql.json((body.quietHours ?? null) as never)}) on conflict(user_id) do update set quiet_hours=excluded.quiet_hours`;
      return {ok:true};
    });
  }

  @Post('workspaces/:id/close')
  closeWorkspace(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) { return this.account.closeWorkspace(ctx,id); }

  @Get('billing')
  billingStatus(@CurrentCtx() ctx: TxCtx) {
    return this.billing.status(ctx);
  }

  @Post('admin/locations/:id/publish')
  adminPublish(@CurrentCtx() ctx: TxCtx, @Param('id') id: string) {
    return this.locations.moderatePublish(ctx,id,'published');
  }

  @Get('admin/audit')
  audit(@CurrentCtx() ctx: TxCtx) {
    return this.db.run(ctx,null,async sql=>{const [a]=await sql`select app_is_platform() as allowed`;if(!a.allowed)fail('PERMISSION_DENIED','Không đủ quyền.');return {items:camel(await sql`select * from audit_events order by id desc limit 200`)};});
  }

  @Get('catalog/commodities')
  commodities() {
    return [
      { id: '11111111-1111-4111-8111-111111111111', code: 'rubber_latex', nameVi: 'Mủ nước' },
      { id: '11111111-1111-4111-8111-111111111112', code: 'cashew', nameVi: 'Hạt điều' },
      { id: '11111111-1111-4111-8111-111111111113', code: 'coffee', nameVi: 'Cà phê' },
      { id: '11111111-1111-4111-8111-111111111114', code: 'pepper', nameVi: 'Hồ tiêu' },
    ];
  }

  @Get('reports/workspace')
  reports(@CurrentCtx() ctx: TxCtx) {
    return this.db.run(ctx,'export.financial',async sql=>{const [r]=await sql`select count(*)::int as orders from order_participants where workspace_id=${requireWorkspace(ctx)}`;return r;});
  }
}
