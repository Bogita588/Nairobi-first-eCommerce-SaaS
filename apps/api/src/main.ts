import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.HEADER, header: 'X-API-Version', defaultVersion: '1' });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true
  }));

  app.use(helmet({
    contentSecurityPolicy: false
  }));

  const port = process.env.PORT || 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API running on port ${port}`);
}

bootstrap();
