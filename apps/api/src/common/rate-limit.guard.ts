import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { Database, personalCtx } from '../infra/database';
import type { Actor } from '../auth/jwt';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly db: Database) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{actor?: Actor}>();
    if (!req.actor) return true; // Anonymous traffic is limited at the ingress.
    const allowed = await this.db.run(personalCtx(req.actor.userId), null, async sql => {
      const [r] = await sql`select consume_api_budget() as allowed`;
      return r.allowed;
    });
    if (!allowed) {
      context.switchToHttp().getResponse().setHeader('Retry-After', '60');
      throw new HttpException({code:'RATE_LIMITED',message:'Quá nhiều yêu cầu, thử lại sau một phút.'},429);
    }
    return true;
  }
}
