import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { OutboxEntity } from '@itms/events';
import { loadConfig } from './config/configuration';
import { FareConfigEntity } from './entities/fare-config.entity';
import { ZoneFareOverride } from './entities/zone-fare-override.entity';
import { FareCalculation } from './entities/fare-calculation.entity';
import { FareAdjustment } from './entities/fare-adjustment.entity';

const config = loadConfig();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  entities: [FareConfigEntity, ZoneFareOverride, FareCalculation, FareAdjustment, OutboxEntity],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
});

export default AppDataSource;
