import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthGuardModule } from '@itms/auth';
import { HealthModule } from '@itms/common';
import { EventsModule, OutboxEntity } from '@itms/events';
import { PASSENGER_CONFIG, loadConfig } from './config/configuration';
import { AppDataSource } from './data-source';
import { Passenger } from './entities/passenger.entity';
import { SavedMethod } from './entities/saved-method.entity';
import { RideHistoryProjection } from './entities/ride-history-proj.entity';
import { PassengersController } from './passengers/passengers.controller';
import { PassengersService } from './passengers/passengers.service';
import { PassengerEventsConsumer } from './passengers/passenger-events.consumer';
import { AuthClient } from './auth/auth.client';

const config = loadConfig();
const dsHolder: { ds?: DataSource } = {};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    TypeOrmModule.forRoot({ ...AppDataSource.options }),
    TypeOrmModule.forFeature([Passenger, SavedMethod, RideHistoryProjection, OutboxEntity]),
    AuthGuardModule.forRoot({ publicKey: config.jwt.publicKey, issuer: config.jwt.issuer }),
    EventsModule.forRoot({
      url: config.rabbit.url,
      exchange: config.rabbit.exchange,
      serviceName: 'passenger',
      enableOutbox: true,
    }),
    HealthModule.forRoot('passenger', [
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
  controllers: [PassengersController],
  providers: [
    { provide: PASSENGER_CONFIG, useValue: config },
    PassengersService,
    PassengerEventsConsumer,
    AuthClient,
  ],
})
export class AppModule {
  constructor(dataSource: DataSource) {
    dsHolder.ds = dataSource;
  }
}
