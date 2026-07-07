import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { OutboxEntity } from '@itms/events';
import { loadConfig } from './config/configuration';
import { User } from './entities/user.entity';
import { OtpChallenge } from './entities/otp-challenge.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Device } from './entities/device.entity';

/**
 * TypeORM DataSource used by both the running service and the migration CLI.
 * `synchronize` is always false — schema changes go through explicit migrations
 * (docs/devops.md §2, expand→migrate→contract).
 */
const config = loadConfig();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  entities: [User, OtpChallenge, RefreshToken, Device, OutboxEntity],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
});

