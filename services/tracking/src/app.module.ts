import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthGuardModule } from '@itms/auth';
import { HealthModule } from '@itms/common';
import { EventsModule } from '@itms/events';
import { TRACKING_CONFIG, loadConfig } from './config/configuration';
import { AppDataSource } from './data-source';
import { GpsLog } from './entities/gps-log.entity';
import { TrailSlice } from './entities/trail-slice.entity';
import { TrackerHealth } from './entities/tracker-health.entity';
import { TrackingService } from './ingest/tracking.service';
import { MqttIngestService } from './ingest/mqtt-ingest.service';
import { DeviceRegistry } from './ingest/device-registry.service';
import { HistoryBufferService } from './history/history-buffer.service';
import { TrackerHealthService } from './health/tracker-health.service';
import { TrailService } from './trails/trail.service';
import { LIVE_LOCATION_STORE, RedisLiveLocationStore } from './live/live-location.store';
import { InternalTrackingController, TrackingController } from './query/tracking.controller';

const config = loadConfig();
const dsHolder: { ds?: DataSource } = {};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({ ...AppDataSource.options }),
    TypeOrmModule.forFeature([GpsLog, TrailSlice, TrackerHealth]),
    AuthGuardModule.forRoot({ publicKey: config.jwt.publicKey, issuer: config.jwt.issuer }),
    EventsModule.forRoot({
      url: config.rabbit.url,
      exchange: config.rabbit.exchange,
      serviceName: 'tracking',
    }),
    HealthModule.forRoot('tracking', [
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
  controllers: [TrackingController, InternalTrackingController],
  providers: [
    { provide: TRACKING_CONFIG, useValue: config },
    { provide: LIVE_LOCATION_STORE, useClass: RedisLiveLocationStore },
    TrackingService,
    HistoryBufferService,
    DeviceRegistry,
    MqttIngestService,
    TrackerHealthService,
    TrailService,
  ],
})
export class AppModule {
  constructor(dataSource: DataSource) {
    dsHolder.ds = dataSource;
  }
}
