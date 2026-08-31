import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as path from 'path';
import * as fs from 'fs';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { isCorsOriginAllowed, resolveCorsOrigins } from './common/config/cors';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(PinoLogger);
  app.useLogger(logger);

  // Serve locally uploaded images (fallback when Cloudinary not configured)
  const uploadsDir = path.join(__dirname, '..', '..', 'web', 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  app.use(helmet());
  app.use(cookieParser());

  app.setGlobalPrefix('api');

  const allowedOrigins = resolveCorsOrigins();
  app.enableCors({
    origin: (origin, callback) => callback(null, isCorsOriginAllowed(origin, allowedOrigins)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('ShopTaj API')
    .setDescription('Full e-commerce platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`ShopTaj backend running on http://localhost:${port}`);
  logger.log(`API docs: http://localhost:${port}/api/docs`);
}

bootstrap();
