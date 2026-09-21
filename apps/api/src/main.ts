import 'reflect-metadata';
import { configureHttp } from './bootstrap';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureHttp(app);

  const swagger = new DocumentBuilder()
    .setTitle('THUMUA365 API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Workspace-Id', in: 'header' }, 'workspace')
    .build();
  if (process.env.NODE_ENV !== 'production') SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

bootstrap().catch(() => { console.error('API startup failed; verify configuration and database readiness.'); process.exitCode = 1; });
