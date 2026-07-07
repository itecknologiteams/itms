import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { OutboxEntity } from '@itms/events';
import { loadConfig } from './config/configuration';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { Reconciliation } from './entities/reconciliation.entity';
import { PayableRide } from './entities/payable-ride.entity';

const config = loadConfig();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  entities: [Payment, Refund, Reconciliation, PayableRide, OutboxEntity],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
});

export default AppDataSource;
