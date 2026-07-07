import { Injectable, Logger } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { PushProvider, SendResult, SmsProvider } from './provider.interface';

/**
 * Deterministic stub adapters (same pattern as Payment's gateway stubs and
 * Document's storage stub): always succeed so the rest of the pipeline
 * (templates, rendering, delivery log) is fully exercised now. Real FCM
 * (firebase-admin) and an SMS aggregator client plug in behind these two
 * interfaces later — a pending client input (OPEN-3) for the SMS account.
 */
@Injectable()
export class StubPushProvider implements PushProvider {
  private readonly logger = new Logger(StubPushProvider.name);

  async send(deviceToken: string, title: string, body: string): Promise<SendResult> {
    this.logger.debug(`[STUB PUSH] -> ${deviceToken.slice(0, 8)}...: ${title} — ${body}`);
    return { ok: true, providerRef: `stub-fcm-${uuidv7()}` };
  }
}

@Injectable()
export class StubSmsProvider implements SmsProvider {
  private readonly logger = new Logger(StubSmsProvider.name);

  async send(phone: string, body: string): Promise<SendResult> {
    this.logger.debug(`[STUB SMS] -> ${phone}: ${body}`);
    return { ok: true, providerRef: `stub-sms-${uuidv7()}` };
  }
}
