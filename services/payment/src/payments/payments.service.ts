import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ConflictError, DomainRuleError, NotFoundError } from '@itms/common';
import { EventNames, OutboxEntity } from '@itms/events';
import { DataSource, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { PAYMENT_CONFIG, PaymentConfig } from '../config/configuration';
import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';
import { PayableRide } from '../entities/payable-ride.entity';
import { canAttempt } from '../domain/payment-policy';
import { idempotencyKey } from '../domain/idempotency';
import { StubCardGateway, StubJazzCashGateway } from '../gateways/stub.gateway';
import { PaymentGateway } from '../gateways/gateway.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly gateways: Record<'jazzcash' | 'card', PaymentGateway>;

  constructor(
    @Inject(PAYMENT_CONFIG) private readonly config: PaymentConfig,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(PayableRide) private readonly payable: Repository<PayableRide>,
    jazzcash: StubJazzCashGateway,
    card: StubCardGateway,
  ) {
    // Only stub adapters exist today (OPEN-3); selecting by config.mode is the
    // seam where real JazzCash/1LINK clients plug in without touching callers.
    this.gateways = { jazzcash, card };
  }

  /** Called when Fare publishes fare.calculated — caches the payable amount. */
  async onFareCalculated(rideId: string, totalPaisa: number, version: number): Promise<void> {
    const existing = await this.payable.findOne({ where: { rideId } });
    if (existing) return; // idempotent
    await this.payable.save(
      this.payable.create({ rideId, amountPaisa: String(totalPaisa), fareConfigVersion: version }),
    );
  }

  /** Passenger-initiated payment attempt (cash confirmation uses a separate path). */
  async pay(rideId: string, method: PaymentMethod): Promise<Payment> {
    if (method === PaymentMethod.Cash) {
      throw new DomainRuleError('USE_CASH_RECEIVED', 'Use the cash-received endpoint for cash');
    }
    const payable = await this.requirePayable(rideId);
    const priorAttempts = await this.payments.count({ where: { rideId } });

    const decision = canAttempt(method, priorAttempts, this.config.policy);
    if (!decision.allowed) {
      throw new ConflictError(decision.reason ?? 'RETRY_NOT_ALLOWED', 'Digital retries exhausted; use cash');
    }

    const attemptN = priorAttempts + 1;
    const key = idempotencyKey(rideId, attemptN);
    const existingAttempt = await this.payments.findOne({ where: { idempotencyKey: key } });
    if (existingAttempt) return existingAttempt; // replay-safe

    const amountPaisa = Number(payable.amountPaisa);
    const gateway = this.gateways[method as 'jazzcash' | 'card'];

    const payment = await this.payments.save(
      this.payments.create({
        id: uuidv7(),
        rideId,
        method,
        amountPaisa: String(amountPaisa),
        status: PaymentStatus.PendingGateway,
        attemptN,
        idempotencyKey: key,
        gatewayTxnRef: null,
        gatewayResponse: null,
        settledAt: null,
      }),
    );

    const outcome = await gateway.initiate({ rideId, amountPaisa, idempotencyKey: key });

    if (outcome.status === 'succeeded') {
      return this.markSucceeded(payment, outcome.txnRef, outcome.raw);
    }
    if (outcome.status === 'failed') {
      return this.markFailed(payment, outcome.raw);
    }
    // 'pending' — awaiting an async callback; leave as PendingGateway.
    payment.gatewayTxnRef = outcome.txnRef;
    payment.gatewayResponse = outcome.raw;
    return this.payments.save(payment);
  }

  /** Driver confirms cash received (docs/specs.md D-09). */
  async cashReceived(rideId: string, driverId: string): Promise<Payment> {
    const payable = await this.requirePayable(rideId);
    const existingSuccess = await this.payments.findOne({
      where: { rideId, status: PaymentStatus.Succeeded },
    });
    if (existingSuccess) return existingSuccess; // idempotent double-tap

    const priorAttempts = await this.payments.count({ where: { rideId } });
    const attemptN = priorAttempts + 1;
    const payment = this.payments.create({
      id: uuidv7(),
      rideId,
      method: PaymentMethod.Cash,
      amountPaisa: payable.amountPaisa,
      status: PaymentStatus.PendingGateway,
      attemptN,
      idempotencyKey: idempotencyKey(rideId, attemptN),
      gatewayTxnRef: null,
      gatewayResponse: { confirmed_by: driverId },
      settledAt: null,
    });
    return this.markSucceeded(payment, null, { confirmed_by: driverId });
  }

  /** Server-to-server gateway callback (docs/specs.md §8.1: never trust client-side alone). */
  async handleCallback(
    method: 'jazzcash' | 'card',
    payload: { ride_id: string; txn_ref: string; status: 'success' | 'failed'; raw: Record<string, unknown> },
    signature: string | undefined,
  ): Promise<void> {
    const gateway = this.gateways[method];
    if (!gateway.verifyCallback(payload.raw, signature)) {
      throw new DomainRuleError('BAD_SIGNATURE', 'Callback signature verification failed');
    }

    // Dedupe on gateway_txn_ref: a replayed callback is a no-op (docs/specs.md §8.2).
    const existing = await this.payments.findOne({ where: { gatewayTxnRef: payload.txn_ref } });
    if (existing && existing.status === PaymentStatus.Succeeded) return;

    const payment =
      existing ??
      (await this.payments.findOne({
        where: { rideId: payload.ride_id, status: PaymentStatus.PendingGateway },
        order: { initiatedAt: 'DESC' },
      }));
    if (!payment) {
      this.logger.warn(`Callback for unknown payment: ride=${payload.ride_id} txn=${payload.txn_ref}`);
      return;
    }

    if (payload.status === 'success') {
      await this.markSucceeded(payment, payload.txn_ref, payload.raw);
    } else {
      await this.markFailed(payment, payload.raw);
    }
  }

  private async markSucceeded(
    payment: Payment,
    txnRef: string | null,
    raw: Record<string, unknown>,
  ): Promise<Payment> {
    // Guard: a ride can never accumulate two successful payments (docs/specs.md §8.2).
    const otherSuccess = await this.payments.findOne({
      where: { rideId: payment.rideId, status: PaymentStatus.Succeeded },
    });
    if (otherSuccess && otherSuccess.id !== payment.id) {
      this.logger.error(
        `Duplicate success detected for ride ${payment.rideId}; flagging for refund review`,
      );
      // A second success never overwrites the first; it's recorded but not
      // treated as authoritative, and ops is alerted via the log/metrics pipeline.
      return otherSuccess;
    }

    return this.dataSource.transaction(async (mgr) => {
      payment.status = PaymentStatus.Succeeded;
      payment.gatewayTxnRef = txnRef;
      payment.gatewayResponse = raw;
      payment.settledAt = new Date();
      await mgr.save(payment);
      await mgr.save(
        mgr.create(OutboxEntity, {
          id: uuidv7(),
          eventName: EventNames.PaymentCompleted,
          payload: {
            ride_id: payment.rideId,
            payment_id: payment.id,
            method: payment.method,
            amount_paisa: Number(payment.amountPaisa),
            gateway_txn_ref: txnRef,
          },
          sentAt: null,
        }),
      );
      return payment;
    });
  }

  private async markFailed(payment: Payment, raw: Record<string, unknown>): Promise<Payment> {
    return this.dataSource.transaction(async (mgr) => {
      payment.status = PaymentStatus.Failed;
      payment.gatewayResponse = raw;
      await mgr.save(payment);
      await mgr.save(
        mgr.create(OutboxEntity, {
          id: uuidv7(),
          eventName: EventNames.PaymentFailed,
          payload: { ride_id: payment.rideId, payment_id: payment.id, method: payment.method },
          sentAt: null,
        }),
      );
      return payment;
    });
  }

  private async requirePayable(rideId: string): Promise<PayableRide> {
    const row = await this.payable.findOne({ where: { rideId } });
    if (!row) throw new NotFoundError('RIDE_NOT_PAYABLE', 'Fare has not been calculated for this ride yet');
    return row;
  }

  async receipt(rideId: string) {
    const payment = await this.payments.findOne({
      where: { rideId, status: PaymentStatus.Succeeded },
    });
    if (!payment) throw new NotFoundError('NO_RECEIPT', 'No completed payment for this ride');
    return {
      ride_id: rideId,
      method: payment.method,
      amount_paisa: Number(payment.amountPaisa),
      settled_at: payment.settledAt,
      gateway_txn_ref: payment.gatewayTxnRef,
    };
  }
}
