import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PgAccountService as AccountService } from './infra/pg-ops';
import { JwtVerifier } from './auth/jwt';
import { SupabaseJwtGuard, WorkspacePermissionGuard } from './auth/guards';
import { PgBillingService as BillingService } from './infra/pg-ops';
import { AppExceptionFilter } from './common/filters';
import { RequestIdMiddleware } from './common/request-id';
import { PgFilesService as FilesService } from './infra/pg-ops';
import { HealthController } from './health/health.controller';
import { OpsController } from './http/ops.controller';
import { TradeController } from './http/trade.controller';
import { IdentityController } from './identity/identity.controller';
import { PgIdentityService as IdentityService } from './infra/pg-identity';
import { Database } from './infra/database';
import { LegacyController } from './http/legacy.controller';
import { PgLegacyService } from './infra/pg-legacy';
import { CommandInterceptor } from './common/command.interceptor';
import { validateConfig } from './common/config';
import { RateLimitGuard } from './common/rate-limit.guard';
import { PgInventoryService as InventoryService } from './infra/pg-market';
import { LocationsController } from './locations/locations.controller';
import { PgLocationsService as LocationsService } from './infra/pg-market';
import { PgMarketplaceService as MarketplaceService } from './infra/pg-market';
import { PgNotificationsService as NotificationsService } from './infra/pg-ops';
import { PgOrdersService as OrdersService } from './infra/pg-trade';
import { PgQuotationsService as QuotationsService } from './infra/pg-trade';
import { PgReceivingService as ReceivingService } from './infra/pg-trade';
import { SettlementsController } from './settlements/settlements.controller';
import { PgSettlementsService as SettlementsService } from './infra/pg-settlements';
import { SyncController } from './sync/sync.controller';
import { PgSyncService as SyncService } from './infra/pg-sync';
import { WorkspacesController } from './workspaces/workspaces.controller';
import { PgWorkspacesService as WorkspacesService } from './infra/pg-identity';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateConfig })],
  controllers: [
    LegacyController,
    HealthController,
    IdentityController,
    WorkspacesController,
    LocationsController,
    TradeController,
    SettlementsController,
    SyncController,
    OpsController,
  ],
  providers: [
    Database,
    PgLegacyService,
    JwtVerifier,
    IdentityService,
    WorkspacesService,
    LocationsService,
    MarketplaceService,
    QuotationsService,
    OrdersService,
    ReceivingService,
    InventoryService,
    SettlementsService,
    SyncService,
    AccountService,
    FilesService,
    NotificationsService,
    BillingService,
    WorkspacePermissionGuard,
    { provide: APP_INTERCEPTOR, useClass: CommandInterceptor },
    { provide: APP_GUARD, useClass: SupabaseJwtGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_FILTER, useClass: AppExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
