import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuthGuardModule } from '@itms/auth';
import { HealthModule } from '@itms/common';
import { EventsModule } from '@itms/events';
import { DISPATCH_CONFIG, loadConfig } from './config/configuration';
import { DriverRegistry } from './registries/driver-registry.service';
import { ZoneCache } from './registries/zone-cache.service';
import { CLAIM_STORE, RedisClaimStore } from './claim/claim.store';
import { MatchingService } from './matching/matching.service';
import { DispatchEventsConsumer } from './matching/dispatch-events.consumer';
import { InternalDispatchController } from './matching/internal.controller';

const config = loadConfig();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    AuthGuardModule.forRoot({ publicKey: config.jwt.publicKey, issuer: config.jwt.issuer }),
    EventsModule.forRoot({
      url: config.rabbit.url,
      exchange: config.rabbit.exchange,
      serviceName: 'dispatch',
    }),
    HealthModule.forRoot('dispatch', []),
  ],
  controllers: [InternalDispatchController],
  providers: [
    { provide: DISPATCH_CONFIG, useValue: config },
    { provide: CLAIM_STORE, useClass: RedisClaimStore },
    DriverRegistry,
    ZoneCache,
    MatchingService,
    DispatchEventsConsumer,
  ],
})
export class AppModule {}
