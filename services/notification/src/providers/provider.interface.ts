export interface SendResult {
  ok: boolean;
  providerRef?: string;
  error?: string;
}

/** Push (FCM) and SMS provider adapters (docs/specs.md §10; techstack.md §OPEN-3). */
export interface PushProvider {
  send(deviceToken: string, title: string, body: string): Promise<SendResult>;
}

export interface SmsProvider {
  send(phone: string, body: string): Promise<SendResult>;
}

export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');
export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
