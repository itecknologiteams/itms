import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { applyCommonSetup, loggerConfig } from '@itms/common';
import { LoggerModule } from 'nestjs-pino';
import { Module } from '@nestjs/common';
import { AppModule } from './app.module';

/** Wraps AppModule with pino logging configured for this service. */
@Module({
  imports: [LoggerModule.forRoot(loggerConfig('auth')), AppModule],
})
class RootModule {}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(RootModule, { bufferLogs: true });
  applyCommonSetup(app, { serviceName: 'auth' });

  const port = Number(process.env.AUTH_SERVICE_PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  app.get(PinoLogger).log(`Auth service listening on :${port}`);
}

void bootstrap();
