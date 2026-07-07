/**
 * Minimal, pure `{{variable}}` template renderer (docs/specs.md §10: templates
 * "managed in Notification Service, editable without deploy"). No external
 * templating dependency — the syntax is intentionally tiny and predictable.
 */
export interface RenderResult {
  text: string;
  missingVariables: string[];
}

const VAR_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export function renderTemplate(template: string, variables: Record<string, unknown>): RenderResult {
  const missing: string[] = [];
  const text = template.replace(VAR_PATTERN, (_match, name: string) => {
    if (!(name in variables) || variables[name] === undefined || variables[name] === null) {
      missing.push(name);
      return `{{${name}}}`;
    }
    return String(variables[name]);
  });
  return { text, missingVariables: [...new Set(missing)] };
}

/** Extracts the variable names a template references, for admin-side validation. */
export function templateVariables(template: string): string[] {
  const names = new Set<string>();
  for (const match of template.matchAll(VAR_PATTERN)) {
    names.add(match[1]);
  }
  return [...names];
}
