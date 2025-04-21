/**
 * EPUB Canonical Fragment Identifier (CFI) utilities
 * Based on the EPUB CFI 1.1 specification: https://idpf.org/epub/linking/cfi/epub-cfi.html
 */

/**
 * Interface for a parsed CFI part
 */
export interface CfiPart {
  index: number;
  id?: string;
  offset?: number;
  temporal?: number;
  spatial?: number[];
  text?: string[];
  side?: string;
}

/**
 * Interface for a parsed CFI range
 */
export interface CfiRange {
  parent: CfiPart[][];
  start: CfiPart[][];
  end: CfiPart[][];
}

/**
 * Interface for a parsed CFI
 */
export type ParsedCfi = CfiPart[][] | CfiRange;

/**
 * Regular expression to check if a string is a valid CFI
 */
export const isCFI = /^epubcfi\((.*)\)$/;

/**
 * Escape special characters in a CFI string
 * @param str The string to escape
 * @returns The escaped string
 */
export function cfiEscape(str: string): string {
  return str.replace(/[\[\]\^,();]/g, `^$&`);
}

/**
 * Unescape special characters in a CFI string
 * @param str The string to unescape
 * @returns The unescaped string
 */
export function cfiUnescape(str: string): string {
  return str.replace(/\^([\[\]\^,();])/g, '$1');
}

/**
 * Wrap a CFI string in the epubcfi() function
 * @param cfi The CFI string to wrap
 * @returns The wrapped CFI string
 */
export function wrapCfi(cfi: string): string {
  return isCFI.test(cfi) ? cfi : `epubcfi(${cfi})`;
}

/**
 * Unwrap a CFI string from the epubcfi() function
 * @param cfi The CFI string to unwrap
 * @returns The unwrapped CFI string
 */
export function unwrapCfi(cfi: string): string {
  const match = cfi.match(isCFI);
  return match ? match[1] : cfi;
}

/**
 * Tokenize a CFI string into an array of tokens
 * @param cfi The CFI string to tokenize
 * @returns An array of tokens
 */
function tokenize(cfi: string): Array<[string, any]> {
  const tokens: Array<[string, any]> = [];
  let state: string | null = null;
  let escape = false;
  let value = '';
  
  const push = (token: [string, any]) => {
    tokens.push(token);
    state = null;
    value = '';
  };
  
  const cat = (char: string) => {
    value += char;
    escape = false;
  };
  
  const chars = Array.from(unwrapCfi(cfi).trim()).concat('');
  
  for (const char of chars) {
    if (char === '^' && !escape) {
      escape = true;
      continue;
    }
    
    if (state === '!') {
      push(['!', null]);
    } else if (state === ',') {
      push([',', null]);
    } else if (state === '/' || state === ':') {
      if (/^\d$/.test(char)) {
        cat(char);
        continue;
      } else {
        push([state, parseInt(value, 10)]);
      }
    } else if (state === '~') {
      if (/^\d$/.test(char) || char === '.') {
        cat(char);
        continue;
      } else {
        push(['~', parseFloat(value)]);
      }
    } else if (state === '@') {
      if (char === ':') {
        push(['@', parseFloat(value)]);
        state = '@';
        continue;
      }
      if (/^\d$/.test(char) || char === '.') {
        cat(char);
        continue;
      } else {
        push(['@', parseFloat(value)]);
      }
    } else if (state === '[') {
      if (char === ';' && !escape) {
        push(['[', value]);
        state = ';';
      } else if (char === ',' && !escape) {
        push(['[', value]);
        state = '[';
      } else if (char === ']' && !escape) {
        push(['[', value]);
      } else {
        cat(char);
        continue;
      }
    } else if (state?.startsWith(';')) {
      if (char === '=' && !escape) {
        state = `;${value}`;
        value = '';
      } else if (char === ';' && !escape) {
        push([state, value]);
        state = ';';
      } else if (char === ']' && !escape) {
        push([state, value]);
      } else {
        cat(char);
        continue;
      }
    }
    
    if (
      char === '/' ||
      char === ':' ||
      char === '~' ||
      char === '@' ||
      char === '[' ||
      char === '!' ||
      char === ','
    ) {
      state = char;
    }
  }
  
  return tokens;
}

/**
 * Find indices of tokens with a specific type
 * @param tokens The tokens to search
 * @param type The type to find
 * @returns An array of indices
 */
function findTokenIndices(tokens: Array<[string, any]> | undefined, type: string): number[] {
  if (!tokens) {
    return [];
  }
  
  return tokens
    .map((token, i) => (token[0] === type ? i : null))
    .filter((i): i is number => i !== null);
}

/**
 * Split an array at specific indices
 * @param arr The array to split
 * @param indices The indices to split at
 * @returns An array of arrays
 */
function splitAt<T>(arr: T[], indices: number[]): T[][] {
  const result: T[][] = [];
  let start = 0;
  
  for (const index of indices) {
    result.push(arr.slice(start, index));
    start = index;
  }
  
  result.push(arr.slice(start));
  return result;
}

/**
 * Parse a single part of a CFI
 * @param tokens The tokens to parse
 * @returns An array of CFI parts
 */
function parsePart(tokens: Array<[string, any]>): CfiPart[] {
  const parts: CfiPart[] = [];
  let state: string | null = null;
  
  for (const [type, val] of tokens) {
    if (type === '/') {
      parts.push({ index: val });
    } else {
      const last = parts[parts.length - 1];
      if (!last) continue;
      
      if (type === ':') {
        last.offset = val;
      } else if (type === '~') {
        last.temporal = val;
      } else if (type === '@') {
        last.spatial = (last.spatial || []).concat(val);
      } else if (type.startsWith(';')) {
        last.side = val;
      } else if (type === '[') {
        if (state === '/' && val) {
          last.id = val;
        } else {
          last.text = (last.text || []).concat(val);
          continue;
        }
      }
    }
    state = type;
  }
  
  return parts;
}

/**
 * Parse a CFI with indirections
 * @param tokens The tokens to parse
 * @returns An array of arrays of CFI parts
 */
function parseIndirection(tokens: Array<[string, any]>): CfiPart[][] {
  const indirectionIndices = findTokenIndices(tokens, '!');
  return splitAt(tokens, indirectionIndices).map(parsePart);
}

/**
 * Parse a CFI string into a structured representation
 * @param cfi The CFI string to parse
 * @returns A parsed CFI
 */
export function parse(cfi: string): ParsedCfi {
  if (!cfi) {
    throw new Error("CFI string cannot be empty");
  }
  
  const tokens = tokenize(cfi);
  if (!tokens || tokens.length === 0) {
    throw new Error("Failed to tokenize CFI string");
  }
  
  const commaIndices = findTokenIndices(tokens, ',');
  
  if (commaIndices.length === 0) {
    return parseIndirection(tokens);
  }
  
  const [parentTokens, startTokens, endTokens] = splitAt(tokens, commaIndices);
  
  return {
    parent: parseIndirection(parentTokens || []),
    start: parseIndirection(startTokens || []),
    end: parseIndirection(endTokens || [])
  };
}

/**
 * Convert a CFI part to a string
 * @param part The CFI part to convert
 * @returns A string representation of the CFI part
 */
function partToString(part: CfiPart): string {
  const param = part.side ? `;s=${part.side}` : '';
  
  return (
    `/${part.index}` +
    (part.id ? `[${cfiEscape(part.id)}${param}]` : '') +
    (part.offset != null && part.index % 2 ? `:${part.offset}` : '') +
    (part.temporal ? `~${part.temporal}` : '') +
    (part.spatial ? `@${part.spatial.join(':')}` : '') +
    (part.text || (!part.id && part.side)
      ? `[${(part.text || []).map(cfiEscape).join(',')}${param}]`
      : '')
  );
}

/**
 * Convert a parsed CFI to a string
 * @param parsed The parsed CFI to convert
 * @returns A string representation of the CFI
 */
export function parsedCfiToString(parsed: ParsedCfi): string {
  if ('parent' in parsed) {
    // It's a range
    const parent = parsed.parent.map(parts => parts.map(partToString).join('')).join('!');
    const start = parsed.start.map(parts => parts.map(partToString).join('')).join('!');
    const end = parsed.end.map(parts => parts.map(partToString).join('')).join('!');
    
    return wrapCfi(`${parent},${start},${end}`);
  } else {
    // It's a single CFI
    return wrapCfi(parsed.map(parts => parts.map(partToString).join('')).join('!'));
  }
}

/**
 * Collapse a parsed CFI to a single path
 * @param parsed The parsed CFI to collapse
 * @param toEnd Whether to collapse to the end of a range
 * @returns A collapsed CFI
 */
export function collapse(parsed: ParsedCfi, toEnd = false): CfiPart[][] {
  if (typeof parsed === 'string') {
    return collapse(parse(parsed), toEnd);
  }
  
  if ('parent' in parsed) {
    // It's a range
    if (toEnd) {
      return parsed.parent.concat(parsed.end);
    } else {
      return parsed.parent.concat(parsed.start);
    }
  }
  
  // It's a single CFI
  return parsed;
}

/**
 * Compare two CFIs
 * @param a The first CFI
 * @param b The second CFI
 * @returns -1 if a < b, 0 if a = b, 1 if a > b
 */
export function compare(a: ParsedCfi | string, b: ParsedCfi | string): number {
  if (typeof a === 'string') a = parse(a);
  if (typeof b === 'string') b = parse(b);
  
  if ('parent' in a || 'parent' in b) {
    // At least one is a range
    return (
      compare(collapse(a), collapse(b)) ||
      compare(collapse(a, true), collapse(b, true))
    );
  }
  
  // Both are single CFIs
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const p = a[i] || [];
    const q = b[i] || [];
    const maxIndex = Math.max(p.length, q.length) - 1;
    
    for (let i = 0; i <= maxIndex; i++) {
      const x = p[i];
      const y = q[i];
      
      if (!x) return -1;
      if (!y) return 1;
      if (x.index > y.index) return 1;
      if (x.index < y.index) return -1;
      
      if (i === maxIndex) {
        // Compare offsets
        if (x.offset > y.offset) return 1;
        if (x.offset < y.offset) return -1;
      }
    }
  }
  
  return 0;
}
