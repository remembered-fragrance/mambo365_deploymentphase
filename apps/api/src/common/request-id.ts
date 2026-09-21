import { randomUUID } from 'node:crypto';
import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { requestId?: string }, res: Response, next: NextFunction): void {
    const supplied = req.headers['x-request-id'];
    const id = typeof supplied === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(supplied) ? supplied : randomUUID();
    req.requestId = id;
    res.setHeader('x-request-id', id);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    next();
  }
}
