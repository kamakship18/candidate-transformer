/**
 * Resolves a dot-notation path against a CandidateRecord.
 *
 * Supported patterns:
 *   "full_name"            → scalar field
 *   "emails[0]"            → first element of array
 *   "skills[].name"        → map array, extract .name from each element
 *   "location.country"     → nested object field
 *   "experience[0].company"→ first element then nested
 */
export function resolveDotPath(record: Record<string, unknown>, path: string): unknown {
  if (!path || typeof path !== 'string') {
    return undefined;
  }

  // Tokenize path: split on dots, handle bracket notation
  const tokens = tokenizePath(path);
  return resolveTokens(record as unknown, tokens);
}

type PathToken =
  | { kind: 'key'; key: string }
  | { kind: 'index'; index: number }
  | { kind: 'spread' }; // []

function tokenizePath(path: string): PathToken[] {
  const tokens: PathToken[] = [];
  // Split on dots but keep bracket groups
  const parts = path.split('.');

  for (const part of parts) {
    if (!part) continue;

    // Check for bracket notation e.g. "emails[0]" or "skills[]"
    const bracketMatch = /^([^[]*)\[(\d*)\]$/.exec(part);
    if (bracketMatch) {
      const keyPart = bracketMatch[1];
      const indexPart = bracketMatch[2];

      if (keyPart) {
        tokens.push({ kind: 'key', key: keyPart });
      }

      if (indexPart === '') {
        tokens.push({ kind: 'spread' });
      } else {
        tokens.push({ kind: 'index', index: parseInt(indexPart, 10) });
      }
    } else {
      tokens.push({ kind: 'key', key: part });
    }
  }

  return tokens;
}

function resolveTokens(value: unknown, tokens: PathToken[]): unknown {
  if (tokens.length === 0) {
    return value;
  }

  if (value === null || value === undefined) {
    return undefined;
  }

  const [head, ...rest] = tokens;

  if (head.kind === 'key') {
    if (typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    const obj = value as Record<string, unknown>;
    return resolveTokens(obj[head.key], rest);
  }

  if (head.kind === 'index') {
    if (!Array.isArray(value)) {
      return undefined;
    }
    return resolveTokens(value[head.index], rest);
  }

  if (head.kind === 'spread') {
    if (!Array.isArray(value)) {
      return undefined;
    }
    // Map over array, resolve remaining tokens for each element
    if (rest.length === 0) {
      return value;
    }
    return value.map((item) => resolveTokens(item, rest));
  }

  return undefined;
}
