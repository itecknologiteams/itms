import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadConfig } from './config/configuration';
import { RidesDaily } from './entities/rides-daily.entity';
import { DriverPerformance } from './entities/driver-performance.entity';
import { ViolationSummary } from './entities/violation-summary.entity';
import { PaymentMix } from './entities/payment-mix.entity';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { ProcessedEvent } from './entities/processed-event.entity';

const config = loadConfig();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  entities: [
    RidesDaily,
    DriverPerformance,
    ViolationSummary,
    PaymentMix,
    AdminAuditLog,
    ProcessedEvent,
  ],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
});

