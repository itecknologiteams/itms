import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ConflictError, DomainRuleError } from './app-error';

function mockHost(overrides: Partial<{ method: string; url: string; traceId: string }> = {}) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = {
    method: overrides.method ?? 'POST',
    url: overrides.url ?? '/v1/rides',
    id: overrides.traceId ?? 'trace-123',
    headers: {},
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('renders an AppError into the standard envelope with its code', () => {
    const { host, status, json } = mockHost();
    filter.catch(new ConflictError('RIDE_ALREADY_ASSIGNED', 'Already taken'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'RIDE_ALREADY_ASSIGNED',
        message: 'Already taken',
        trace_id: 'trace-123',
      },
    });
  });

  it('includes details when provided', () => {
    const { host, json } = mockHost();
    filter.catch(new DomainRuleError('OUT_OF_ZONE', 'Pickup outside zone', { zone: 'A' }), host);

    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'OUT_OF_ZONE',
        message: 'Pickup outside zone',
        trace_id: 'trace-123',
        details: { zone: 'A' },
      },
    });
  });

  it('maps unknown errors to a 500 without leaking internals', () => {
    const { host, status, json } = mockHost();
    filter.catch(new Error('database exploded with secret connection string'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const payload = json.mock.calls[0][0];
    expect(payload.error.code).toBe('INTERNAL_ERROR');
    expect(payload.error.message).toBe('An unexpected error occurred');
    expect(JSON.stringify(payload)).not.toContain('secret connection string');
  });
});
