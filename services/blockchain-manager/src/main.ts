import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const PORT = process.env.BLOCKCHAIN_MANAGER_PORT || 3004;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  await app.listen(PORT, '0.0.0.0');
  console.log(`Blockchain manager running on port ${PORT}`);
}

bootstrap();