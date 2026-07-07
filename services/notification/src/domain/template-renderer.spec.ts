import { renderTemplate, templateVariables } from './template-renderer';

describe('renderTemplate', () => {
  it('substitutes known variables', () => {
    const r = renderTemplate('Hi {{name}}, your driver is {{driver_name}}.', {
      name: 'Aamir',
      driver_name: 'Bilal',
    });
    expect(r.text).toBe('Hi Aamir, your driver is Bilal.');
    expect(r.missingVariables).toEqual([]);
  });

  it('leaves unknown placeholders intact and reports them as missing', () => {
    const r = renderTemplate('Fare: {{amount}}', {});
    expect(r.text).toBe('Fare: {{amount}}');
    expect(r.missingVariables).toEqual(['amount']);
  });

  it('deduplicates repeated missing variables', () => {
    const r = renderTemplate('{{x}} and {{x}} again', {});
    expect(r.missingVariables).toEqual(['x']);
  });

  it('coerces non-string values to strings', () => {
    const r = renderTemplate('Fare: {{amount}}', { amount: 15000 });
    expect(r.text).toBe('Fare: 15000');
  });

  it('handles templates with no variables', () => {
    const r = renderTemplate('No driver available right now.', {});
    expect(r.text).toBe('No driver available right now.');
    expect(r.missingVariables).toEqual([]);
  });
});

describe('templateVariables', () => {
  it('extracts unique variable names', () => {
    expect(templateVariables('{{a}} {{b}} {{a}}')).toEqual(['a', 'b']);
  });
  it('returns an empty array for a template with none', () => {
    expect(templateVariables('static text')).toEqual([]);
  });
});
