import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HealthModule } from '@itms/common';
import { EventsModule, OutboxEntity } from '@itms/events';
import { AUTH_CONFIG, loadConfig } from './config/configuration';
import { AppDataSource } from './data-source';
import { User } from './entities/user.entity';
import { OtpChallenge } from './entities/otp-challenge.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Device } from './entities/device.entity';
import { AuthController } from './auth/auth.controller';
import { InternalController } from './auth/internal.controller';
import { AuthService } from './auth/auth.service';
import { OtpService } from './otp/otp.service';
import { TokenService } from './tokens/token.service';

const config = loadConfig();

// Holds the live NestJS-managed DataSource so the readiness probe can reach it.
const dsHolder: { ds?: DataSource } = {};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Reuse the migration DataSource's options; NestJS manages the live connection.
    TypeOrmModule.forRoot({ ...AppDataSource.options }),
    TypeOrmModule.forFeature([User, OtpChallenge, RefreshToken, Device, OutboxEntity]),
    EventsModule.forRoot({
      url: config.rabbit.url,
      exchange: config.rabbit.exchange,
      serviceName: 'auth',
      enableOutbox: true,
    }),
    HealthModule.forRoot('auth', [
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
  controllers: [AuthController, InternalController],
  providers: [
    { provide: AUTH_CONFIG, useValue: config },
    AuthService,
    OtpService,
    TokenService,
  ],
})
export class AppModule {
  constructor(dataSource: DataSource) {
    dsHolder.ds = dataSource;
  }
}
