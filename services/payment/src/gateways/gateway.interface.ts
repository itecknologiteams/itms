export type GatewayOutcome =
  | { status: 'succeeded'; txnRef: string; raw: Record<string, unknown> }
  | { status: 'pending'; txnRef: string; raw: Record<string, unknown> }
  | { status: 'failed'; reason: string; raw: Record<string, unknown> };

/**
 * Common interface for JazzCash and card-gateway adapters (docs/specs.md §8.1;
 * techstack.md §OPEN-3). Real credentials are a pending client input — the stub
 * implementations below simulate the same contract so the rest of the system
 * (idempotency, retries, reconciliation) can be built and tested now, with the
 * real integration swapped in behind this interface later without touching
 * callers.
 */
export interface PaymentGateway {
  readonly name: string;
  initiate(params: {
    rideId: string;
    amountPaisa: number;
    idempotencyKey: string;
  }): Promise<GatewayOutcome>;
  /** Verify an inbound webhook/callback signature before trusting its payload. */
  verifyCallback(payload: Record<string, unknown>, signature: string | undefined): boolean;
}
