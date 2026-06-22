import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { RateLimitHeaders } from '@repo/shared';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.use(helmet());

  const origins = (config.get<string>('CORS_ORIGIN') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    // The browser can only read these response headers if we expose them.
    exposedHeaders: [
      RateLimitHeaders.Limit,
      RateLimitHeaders.Remaining,
      RateLimitHeaders.RetryAfter,
    ],
  });

  // Drain in-flight work and close Redis on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`API listening on :${port}`);
}

void bootstrap();
