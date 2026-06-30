import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from './infrastructure/common/swagger/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS with credentials support
  app.enableCors({
    origin: ['http://localhost:3005', 'http://localhost:3000'],
    credentials: true,
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
