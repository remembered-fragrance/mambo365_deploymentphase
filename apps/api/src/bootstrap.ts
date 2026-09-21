import { INestApplication, ValidationPipe } from '@nestjs/common';

export function configureHttp(app: INestApplication) {
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.enableCors({ origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map(s => s.trim()) });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
}
