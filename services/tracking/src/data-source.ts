import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadConfig } from './config/configuration';
import { GpsLog } from './entities/gps-log.entity';
import { TrailSlice } from './entities/trail-slice.entity';
import { TrackerHealth } from './entities/tracker-health.entity';

const config = loadConfig();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  entities: [GpsLog, TrailSlice, TrackerHealth],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
});

export default AppDataSource;
