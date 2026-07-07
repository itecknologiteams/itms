import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthGuardModule } from '@itms/auth';
import { HealthModule } from '@itms/common';
import { EventsModule, OutboxEntity } from '@itms/events';
import { DRIVER_CONFIG, loadConfig } from './config/configuration';
import { AppDataSource } from './data-source';
import { Driver } from './entities/driver.entity';
import { Vehicle } from './entities/vehicle.entity';
import { DriverVehicleAssignment } from './entities/driver-vehicle-assignment.entity';
import { DriverDocument } from './entities/driver-document.entity';
import { Suspension } from './entities/suspension.entity';
import { DriversController } from './drivers/drivers.controller';
import { DocumentUploadController } from './drivers/document-upload.controller';
import { DriversService } from './drivers/drivers.service';
import { DriverEventsConsumer } from './drivers/driver-events.consumer';
import { VehiclesController } from './vehicles/vehicles.controller';
import { VehiclesService } from './vehicles/vehicles.service';
import { AuthClient } from './auth/auth.client';

const config = loadConfig();
const dsHolder: { ds?: DataSource } = {};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    TypeOrmModule.forRoot({ ...AppDataSource.options }),
    TypeOrmModule.forFeature([
      Driver,
      Vehicle,
      DriverVehicleAssignment,
      DriverDocument,
      Suspension,
      OutboxEntity,
    ]),
    AuthGuardModule.forRoot({ publicKey: config.jwt.publicKey, issuer: config.jwt.issuer }),
    EventsModule.forRoot({
      url: config.rabbit.url,
      exchange: config.rabbit.exchange,
      serviceName: 'driver',
      enableOutbox: true,
    }),
    HealthModule.forRoot('driver', [
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
  controllers: [DriversController, DocumentUploadController, VehiclesController],
  providers: [
    { provide: DRIVER_CONFIG, useValue: config },
    DriversService,
    DriverEventsConsumer,
    VehiclesService,
    AuthClient,
  ],
})
export class AppModule {
  constructor(dataSource: DataSource) {
    dsHolder.ds = dataSource;
  }
}
