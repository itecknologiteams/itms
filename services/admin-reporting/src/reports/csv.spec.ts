import { toCsv } from './csv';

describe('toCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('');
  });

  it('encodes a header row and data rows', () => {
    const csv = toCsv([
      { date: '2026-07-01', rides: 10 },
      { date: '2026-07-02', rides: 20 },
    ]);
    expect(csv).toBe('date,rides\n2026-07-01,10\n2026-07-02,20');
  });

  it('quotes fields containing commas', () => {
    const csv = toCsv([{ note: 'a, b' }]);
    expect(csv).toBe('note\n"a, b"');
  });

  it('doubles embedded quotes', () => {
    const csv = toCsv([{ note: 'say "hi"' }]);
    expect(csv).toBe('note\n"say ""hi"""');
  });

  it('renders null/undefined as empty', () => {
    const csv = toCsv([{ a: null, b: undefined }]);
    expect(csv).toBe('a,b\n,');
  });
});
