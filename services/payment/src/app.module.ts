import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthGuardModule } from '@itms/auth';
import { HealthModule } from '@itms/common';
import { EventsModule, OutboxEntity } from '@itms/events';
import { PAYMENT_CONFIG, loadConfig } from './config/configuration';
import { AppDataSource } from './data-source';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { Reconciliation } from './entities/reconciliation.entity';
import { PayableRide } from './entities/payable-ride.entity';
import { PaymentsController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';
import { PaymentEventsConsumer } from './payments/payment-events.consumer';
import { StubCardGateway, StubJazzCashGateway } from './gateways/stub.gateway';

const config = loadConfig();
const dsHolder: { ds?: DataSource } = {};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({ ...AppDataSource.options }),
    TypeOrmModule.forFeature([Payment, Refund, Reconciliation, PayableRide, OutboxEntity]),
    AuthGuardModule.forRoot({ publicKey: config.jwt.publicKey, issuer: config.jwt.issuer }),
    EventsModule.forRoot({
      url: config.rabbit.url,
      exchange: config.rabbit.exchange,
      serviceName: 'payment',
      enableOutbox: true,
    }),
    HealthModule.forRoot('payment', [
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
  controllers: [PaymentsController],
  providers: [
    { provide: PAYMENT_CONFIG, useValue: config },
    PaymentsService,
    PaymentEventsConsumer,
    StubJazzCashGateway,
    StubCardGateway,
  ],
})
export class AppModule {
  constructor(dataSource: DataSource) {
    dsHolder.ds = dataSource;
  }
}
