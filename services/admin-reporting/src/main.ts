import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { LoggerModule, Logger as PinoLogger } from 'nestjs-pino';
import { applyCommonSetup, loggerConfig } from '@itms/common';
import { AppModule } from './app.module';

@Module({
  imports: [LoggerModule.forRoot(loggerConfig('admin-reporting')), AppModule],
})
class RootModule {}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(RootModule, { bufferLogs: true });
  applyCommonSetup(app, { serviceName: 'admin-reporting' });
  const port = Number(process.env.ADMIN_REPORTING_SERVICE_PORT ?? 3012);
  await app.listen(port, '0.0.0.0');
  app.get(PinoLogger).log(`Admin/Reporting service listening on :${port}`);
}

void bootstrap();
