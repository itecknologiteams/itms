import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { OutboxEntity } from '@itms/events';
import { loadConfig } from './config/configuration';
import { Passenger } from './entities/passenger.entity';
import { SavedMethod } from './entities/saved-method.entity';
import { RideHistoryProjection } from './entities/ride-history-proj.entity';

const config = loadConfig();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  entities: [Passenger, SavedMethod, RideHistoryProjection, OutboxEntity],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
});

export default AppDataSource;
