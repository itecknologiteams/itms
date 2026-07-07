import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthGuardModule } from '@itms/auth';
import { HealthModule } from '@itms/common';
import { EventsModule, OutboxEntity } from '@itms/events';
import { NOTIFICATION_CONFIG, loadConfig } from './config/configuration';
import { AppDataSource } from './data-source';
import { Template } from './entities/template.entity';
import { NotificationRecord } from './entities/notification.entity';
import { Broadcast } from './entities/broadcast.entity';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { BroadcastsService } from './notifications/broadcasts.service';
import { PUSH_PROVIDER, SMS_PROVIDER } from './providers/provider.interface';
import { StubPushProvider, StubSmsProvider } from './providers/stub-providers';

const config = loadConfig();
const dsHolder: { ds?: DataSource } = {};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({ ...AppDataSource.options }),
    TypeOrmModule.forFeature([Template, NotificationRecord, Broadcast, OutboxEntity]),
    AuthGuardModule.forRoot({ publicKey: config.jwt.publicKey, issuer: config.jwt.issuer }),
    EventsModule.forRoot({
      url: config.rabbit.url,
      exchange: config.rabbit.exchange,
      serviceName: 'notification',
    }),
    HealthModule.forRoot('notification', [
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
  controllers: [NotificationsController],
  providers: [
    { provide: NOTIFICATION_CONFIG, useValue: config },
    { provide: PUSH_PROVIDER, useClass: StubPushProvider },
    { provide: SMS_PROVIDER, useClass: StubSmsProvider },
    NotificationsService,
    BroadcastsService,
  ],
})
export class AppModule {
  constructor(dataSource: DataSource) {
    dsHolder.ds = dataSource;
  }
}
