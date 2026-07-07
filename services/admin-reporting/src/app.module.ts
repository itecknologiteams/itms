import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthGuardModule } from '@itms/auth';
import { HealthModule } from '@itms/common';
import { EventsModule } from '@itms/events';
import { ADMIN_REPORTING_CONFIG, loadConfig } from './config/configuration';
import { AppDataSource } from './data-source';
import { RidesDaily } from './entities/rides-daily.entity';
import { DriverPerformance } from './entities/driver-performance.entity';
import { ViolationSummary } from './entities/violation-summary.entity';
import { PaymentMix } from './entities/payment-mix.entity';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { ProcessedEvent } from './entities/processed-event.entity';
import { ProjectionsService } from './projections/projections.service';
import { ProjectionEventsConsumer } from './projections/projection-events.consumer';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { AuditLogController } from './audit/audit-log.controller';
import { AuditLogService } from './audit/audit-log.service';

const config = loadConfig();
const dsHolder: { ds?: DataSource } = {};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({ ...AppDataSource.options }),
    TypeOrmModule.forFeature([
      RidesDaily,
      DriverPerformance,
      ViolationSummary,
      PaymentMix,
      AdminAuditLog,
      ProcessedEvent,
    ]),
    AuthGuardModule.forRoot({ publicKey: config.jwt.publicKey, issuer: config.jwt.issuer }),
    EventsModule.forRoot({
      url: config.rabbit.url,
      exchange: config.rabbit.exchange,
      serviceName: 'admin-reporting',
    }),
    HealthModule.forRoot('admin-reporting', [
      {
        name: 'postgres',
        check: async () => {
          try {
            await dsHolder.ds?.query('SELECT 1');
            return !!dsHolder.ds;
          } catch {
            return false;
          }
        },
      },
    ]),
  ],
  controllers: [ReportsController, AuditLogController],
  providers: [
    { provide: ADMIN_REPORTING_CONFIG, useValue: config },
    ProjectionsService,
    ProjectionEventsConsumer,
    ReportsService,
    AuditLogService,
  ],
})
export class AppModule {
  constructor(dataSource: DataSource) {
    dsHolder.ds = dataSource;
  }
}
