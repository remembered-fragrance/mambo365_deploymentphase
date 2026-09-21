import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/guards';
import { Database } from '../infra/database';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly db: Database) {}

  @Public()
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  async ready() {
    try { return await this.db.ready(); }
    catch { throw new ServiceUnavailableException({ code: 'DATABASE_UNAVAILABLE', message: 'Database chưa sẵn sàng.' }); }
  }

  @Public()
  @Get('version')
  version() {
    return {
      name: 'thumua365-api',
      version: '0.1.0',
      api: 'v1',
    };
  }

  @Public()
  @Header('Cache-Control', 'public, max-age=30')
  @Get('capabilities')
  capabilities() {
    return {
      minAppVersion: '0.1.0',
      flags: {
        marketplace: true,
        syncCommands: true,
        maps: true,
        gpsTracking: false,
        agriPayments: false,
      },
    };
  }
}
