import { bucketKey, isAllowedMime } from './bucket-key';

describe('bucketKey', () => {
  it('formats the documented layout', () => {
    expect(bucketKey('prod', 'license', 'driver-1', 'media-1')).toBe(
      'itms-prod/license/driver-1/media-1',
    );
  });

  it('varies by environment', () => {
    expect(bucketKey('dev', 'cnic', 'd1', 'm1')).not.toBe(bucketKey('prod', 'cnic', 'd1', 'm1'));
  });
});

describe('isAllowedMime', () => {
  it('allows a PDF for license documents', () => {
    expect(isAllowedMime('license', 'application/pdf')).toBe(true);
  });

  it('rejects a PDF for a CNIC photo (image only)', () => {
    expect(isAllowedMime('cnic', 'application/pdf')).toBe(false);
  });

  it('rejects an unknown kind entirely', () => {
    expect(isAllowedMime('unknown_kind', 'image/jpeg')).toBe(false);
  });
});
