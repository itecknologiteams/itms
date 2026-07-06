import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthGuardModule } from '@itms/auth';
import { HealthModule } from '@itms/common';
import { EventsModule, OutboxEntity } from '@itms/events';
import { GEOFENCE_CONFIG, loadConfig } from './config/configuration';
import { AppDataSource } from './data-source';
import { Zone } from './entities/zone.entity';
import { ZoneVersion } from './entities/zone-version.entity';
import { VehicleZonePairing } from './entities/vehicle-zone-pairing.entity';
import { MovementPass } from './entities/movement-pass.entity';
import { Violation } from './entities/violation.entity';
import { ZonesController } from './zones/zones.controller';
import { ZonesService } from './zones/zones.service';
import { ZoneRegistry } from './zones/zone-registry.service';
import { ViolationsController } from './violations/violations.controller';
import { ViolationsService } from './violations/violations.service';
import { AuthorizationService } from './violations/authorization.service';
import { ViolationDetectorService } from './violations/violation-detector.service';

const config = loadConfig();
const dsHolder: { ds?: DataSource } = {};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({ ...AppDataSource.options }),
    TypeOrmModule.forFeature([
      Zone,
      ZoneVersion,
      VehicleZonePairing,
      MovementPass,
      Violation,
      OutboxEntity,
    ]),
    AuthGuardModule.forRoot({ publicKey: config.jwt.publicKey, issuer: config.jwt.issuer }),
    EventsModule.forRoot({
      url: config.rabbit.url,
      exchange: config.rabbit.exchange,
      serviceName: 'geofence',
      enableOutbox: true,
    }),
    HealthModule.forRoot('geofence', [
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
  controllers: [ZonesController, ViolationsController],
  providers: [
    { provide: GEOFENCE_CONFIG, useValue: config },
    ZonesService,
    ZoneRegistry,
    ViolationsService,
    AuthorizationService,
    ViolationDetectorService,
  ],
})
export class AppModule {
  constructor(dataSource: DataSource) {
    dsHolder.ds = dataSource;
  }
}
