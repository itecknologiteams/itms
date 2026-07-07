import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthGuardModule } from '@itms/auth';
import { HealthModule } from '@itms/common';
import { EventsModule, OutboxEntity } from '@itms/events';
import { FARE_CONFIG, loadConfig } from './config/configuration';
import { AppDataSource } from './data-source';
import { FareConfigEntity } from './entities/fare-config.entity';
import { ZoneFareOverride } from './entities/zone-fare-override.entity';
import { FareCalculation } from './entities/fare-calculation.entity';
import { FareAdjustment } from './entities/fare-adjustment.entity';
import { FareConfigController } from './configs/fare-config.controller';
import { FareConfigService } from './configs/fare-config.service';
import { FareCalculationService } from './calculation/fare-calculation.service';
import { FareEventsConsumer } from './calculation/fare-events.consumer';
import { TrackingClient } from './tracking/tracking.client';

const config = loadConfig();
const dsHolder: { ds?: DataSource } = {};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    TypeOrmModule.forRoot({ ...AppDataSource.options }),
    TypeOrmModule.forFeature([FareConfigEntity, ZoneFareOverride, FareCalculation, FareAdjustment, OutboxEntity]),
    AuthGuardModule.forRoot({ publicKey: config.jwt.publicKey, issuer: config.jwt.issuer }),
    EventsModule.forRoot({
      url: config.rabbit.url,
      exchange: config.rabbit.exchange,
      serviceName: 'fare',
      enableOutbox: true,
    }),
    HealthModule.forRoot('fare', [
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
  controllers: [FareConfigController],
  providers: [
    { provide: FARE_CONFIG, useValue: config },
    FareConfigService,
    FareCalculationService,
    FareEventsConsumer,
    TrackingClient,
  ],
})
export class AppModule {
  constructor(dataSource: DataSource) {
    dsHolder.ds = dataSource;
  }
}
