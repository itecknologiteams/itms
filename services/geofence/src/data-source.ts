import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { OutboxEntity } from '@itms/events';
import { loadConfig } from './config/configuration';
import { Zone } from './entities/zone.entity';
import { ZoneVersion } from './entities/zone-version.entity';
import { VehicleZonePairing } from './entities/vehicle-zone-pairing.entity';
import { MovementPass } from './entities/movement-pass.entity';
import { Violation } from './entities/violation.entity';

const config = loadConfig();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  entities: [Zone, ZoneVersion, VehicleZonePairing, MovementPass, Violation, OutboxEntity],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
});

