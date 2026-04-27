import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { AllExceptionsFilter } from './shared/errors/global-exception.filter';
import { createAuthLogger } from './shared/logging/auth-logger';

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection in auth-service:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in auth-service:', error);
});

async function bootstrap() {
  const logger = createAuthLogger();

  const app = await NestFactory.create(AppModule, { logger });

  app.use((request: Request, response: Response, next: NextFunction) => {
    const incomingRequestId = request.headers['x-request-id'];
    const requestIdFromHeader =
      typeof incomingRequestId === 'string'
        ? incomingRequestId
        : Array.isArray(incomingRequestId)
          ? incomingRequestId[0]
          : undefined;

    request.requestId = requestIdFromHeader?.trim() || randomUUID();
    response.setHeader('x-request-id', request.requestId);
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(3001);
}

bootstrap();
