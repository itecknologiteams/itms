import { Injectable, Logger } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { GatewayOutcome, PaymentGateway } from './gateway.interface';

/**
 * Deterministic stub gateway for dev/CI and for driving the rest of the payment
 * pipeline before real JazzCash/1LINK credentials arrive (OPEN-3). Always
 * succeeds synchronously — swap PAYMENT_GATEWAY_MODE and the real adapter in
 * when credentials land; nothing else in the service changes.
 */
@Injectable()
export class StubJazzCashGateway implements PaymentGateway {
  readonly name = 'jazzcash';
  private readonly logger = new Logger(StubJazzCashGateway.name);

  async initiate(params: { rideId: string; amountPaisa: number }): Promise<GatewayOutcome> {
    this.logger.warn(`[STUB] Simulating JazzCash charge for ride ${params.rideId}`);
    return { status: 'succeeded', txnRef: `stub-jc-${uuidv7()}`, raw: { stub: true } };
  }

  verifyCallback(): boolean {
    return true; // stub mode trusts all callbacks; real mode verifies HMAC/signature
  }
}

@Injectable()
export class StubCardGateway implements PaymentGateway {
  readonly name = 'card';
  private readonly logger = new Logger(StubCardGateway.name);

  async initiate(params: { rideId: string; amountPaisa: number }): Promise<GatewayOutcome> {
    this.logger.warn(`[STUB] Simulating card auth+capture for ride ${params.rideId}`);
    return { status: 'succeeded', txnRef: `stub-card-${uuidv7()}`, raw: { stub: true } };
  }

  verifyCallback(): boolean {
    return true;
  }
}
