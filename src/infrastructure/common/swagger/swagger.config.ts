import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

/**
 * Swagger Configuration
 * Purpose: Global API documentation standards for ARI ERP.
 * Standard: ST-1.1 (Multi-tenancy documentation)
 * Fixes: Code Review MEDIUM Finding #4
 */
export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('ARI ERP API')
    .setDescription(`
      The API documentation for ARI: Administración Resiliente e Inteligente.
      
      **Security & Multitenancy Note:**
      This API operates under a strict SaaS model. 
      The \`tenant_id\` is automatically extracted from the Bearer Token (JWT).
      Consumers of this API do **not** need to manually send the \`tenant_id\` in the payload or query parameters.
      Any attempt to query data outside the assigned tenant will result in a 403 Forbidden or 401 Unauthorized error.
    `)
    .setVersion('1.0')
    .addTag('SaaS', 'Multitenant Operations')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter JWT token (includes embedded tenant_id and role)',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
}
