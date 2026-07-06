import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Mounts OpenAPI 3.1 docs at /docs for a service (docs/architecture.md §5).
 * Internal only — never exposed publicly through Kong.
 */
export function setupOpenApi(app: INestApplication, serviceName: string, version = '1.0'): void {
  const config = new DocumentBuilder()
    .setTitle(`ITMS — ${serviceName}`)
    .setDescription(`Electric Taxi Management System — ${serviceName} API`)
    .setVersion(version)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
