import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthGuardModule } from '@itms/auth';
import { HealthModule } from '@itms/common';
import { EventsModule, OutboxEntity } from '@itms/events';
import { RIDE_CONFIG, loadConfig } from './config/configuration';
import { AppDataSource } from './data-source';
import { Ride } from './entities/ride.entity';
import { RideTransition } from './entities/ride-transition.entity';
import { Rating } from './entities/rating.entity';
import { SosEvent } from './entities/sos-event.entity';
import { RideController } from './rides/ride.controller';
import { RideService } from './rides/ride.service';
import { RideGateway } from './rides/ride.gateway';
import { RideEventsConsumer } from './rides/ride-events.consumer';
import { DispatchClient } from './dispatch/dispatch.client';

const config = loadConfig();
const dsHolder: { ds?: DataSource } = {};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    TypeOrmModule.forRoot({ ...AppDataSource.options }),
    TypeOrmModule.forFeature([Ride, RideTransition, Rating, SosEvent, OutboxEntity]),
    AuthGuardModule.forRoot({ publicKey: config.jwt.publicKey, issuer: config.jwt.issuer }),
    EventsModule.forRoot({
      url: config.rabbit.url,
      exchange: config.rabbit.exchange,
      serviceName: 'ride',
      enableOutbox: true,
    }),
    HealthModule.forRoot('ride', [
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
  controllers: [RideController],
  providers: [
    { provide: RIDE_CONFIG, useValue: config },
    RideService,
    RideGateway,
    RideEventsConsumer,
    DispatchClient,
  ],
})
export class AppModule {
  constructor(dataSource: DataSource) {
    dsHolder.ds = dataSource;
  }
}
