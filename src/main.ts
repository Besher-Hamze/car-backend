import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const uploadRoot = join(process.cwd(), 'uploads');
  fs.mkdirSync(join(uploadRoot, 'cars'), { recursive: true });
  fs.mkdirSync(join(uploadRoot, 'documents'), { recursive: true });
  fs.mkdirSync(join(uploadRoot, 'purchase-ids'), { recursive: true });

  app.useStaticAssets(uploadRoot, { prefix: '/uploads/' });
  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  const config = new DocumentBuilder()
    .setTitle('Car Platform API')
    .setDescription('منصة السيارات - واجهة برمجية')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚗 Car Platform API running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
