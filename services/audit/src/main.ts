import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import 'dotenv/config';
import { SeqLogger } from './seq-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new SeqLogger('audit-service'),
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
  }));

  const port = process.env.PORT || 3003;
  await app.listen(port);
}
bootstrap();
