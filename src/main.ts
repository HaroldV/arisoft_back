import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { json, urlencoded } from 'express';
import { setupSwagger } from './infrastructure/common/swagger/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Increase body payload limit to 50MB for high-res product image uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Serve static uploaded files (e.g. /uploads/tenants/:tenant_id/:category/:filename)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // CORS with credentials support and custom header permission
  app.enableCors({
    origin: ['http://localhost:3005', 'http://localhost:3000', 'http://127.0.0.1:3005', 'http://127.0.0.1:3000'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'tenant-id', 'Accept'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Validation
  app.useGlobalPipes(new ValidationPipe());

  // Swagger Configuration
  setupSwagger(app);

  const port = 4000;
  await app.listen(port);
  console.log(`🚀 ARI Backend running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
