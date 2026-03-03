import { ParsedFn } from './types';

const COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#be185d', // pink
  '#854d0e', // brown
];

let colorIndex = 0;
export function resetColorIndex() { colorIndex = 0; }
export function nextColor(): string {
  const c = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  return c;
}

function parseNum(str: string | undefined): number {
  if (!str || str === '+' || str === '') return 1;
  if (str === '-') return -1;
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 2) {
      return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
  }
  return parseFloat(str) || 0;
}

// Regex for a number that might be a fraction, e.g. -1/2 or .5
const numStr = `([+-]?\\d*\\.?\\d*(?:\\/\\d+)?)`;

export function parseEquation(input: string, color?: string): ParsedFn | null {
  let cleaned = input.replace(/\s+/g, '').toLowerCase();
  if (!cleaned || cleaned.length === 0) return null;

  // Remove y= prefix
  if (cleaned.startsWith('y=')) cleaned = cleaned.slice(2);
  if (cleaned.length === 0) return null;

  // Extract piecewise condition like {x<5} or {x>2}
  let condition: ((x: number) => boolean) | undefined;
  const condMatch = cleaned.match(/\{([^}]+)\}/);
  if (condMatch) {
    cleaned = cleaned.replace(/\{[^}]+\}/, '');
    const condStr = condMatch[1];
    const ltMatch = condStr.match(/x([<>]=?)(-?\d+\.?\d*)/);
    if (ltMatch) {
      const op = ltMatch[1];
      const val = parseFloat(ltMatch[2]);
      if (op === '<') condition = (x) => x < val;
      else if (op === '<=') condition = (x) => x <= val;
      else if (op === '>') condition = (x) => x > val;
      else if (op === '>=') condition = (x) => x >= val;
    }
  }

  const c = color || nextColor();

  // Try sin: A*sin(Bx+C)+D
  {
    const m = cleaned.match(new RegExp(`^${numStr}\\*?sin\\(${numStr}\\*?x([+-]\\d*\\.?\\d*(?:\\/\\d+)?)?\\)([+-]\\d*\\.?\\d*(?:\\/\\d+)?)?$`));
    if (cleaned === 'sin(x)') return { fn: Math.sin, condition, color: c };
    const simple = cleaned.match(new RegExp(`^sin\\(x\\)([+-]\\d*\\.?\\d*(?:\\/\\d+)?)?$`));
    if (simple) {
      const d = parseNum(simple[1]);
      return { fn: (x) => Math.sin(x) + d, condition, color: c };
    }
    if (m) {
      const A = parseNum(m[1]);
      const B = parseNum(m[2]);
      const C = parseNum(m[3]);
      const D = parseNum(m[4]);
      if ([A, B, C, D].some(isNaN)) return null;
      return { fn: (x) => A * Math.sin(B * x + C) + D, condition, color: c };
    }
  }

  // Try cos
  if (cleaned.includes('cos(')) {
    const m = cleaned.match(new RegExp(`^${numStr}\\*?cos\\(${numStr}\\*?x([+-]\\d*\\.?\\d*(?:\\/\\d+)?)?\\)([+-]\\d*\\.?\\d*(?:\\/\\d+)?)?$`));
    if (cleaned === 'cos(x)') return { fn: Math.cos, condition, color: c };
    if (m) {
      const A = parseNum(m[1]);
      const B = parseNum(m[2]);
      const C = parseNum(m[3]);
      const D = parseNum(m[4]);
      if ([A, B, C, D].some(isNaN)) return null;
      return { fn: (x) => A * Math.cos(B * x + C) + D, condition, color: c };
    }
  }

  // Try vertex form: a(x-h)^2+k
  {
    const m = cleaned.match(new RegExp(`^${numStr}\\*?\\(x([+-]\\d*\\.?\\d*(?:\\/\\d+)?)\\)\\^2([+-]\\d*\\.?\\d*(?:\\/\\d+)?)?$`));
    if (m) {
      const a = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : parseNum(m[1]);
      const h = -parseNum(m[2]);
      const k = m[3] ? parseNum(m[3]) : 0;
      if (!isNaN(a) && !isNaN(h) && !isNaN(k)) {
        return { fn: (x) => a * (x - h) * (x - h) + k, condition, color: c };
      }
    }
  }

  // Try standard quadratic: ax^2+bx+c
  {
    let expr = cleaned.replace(/x\^2/g, 'X');
    if (expr.includes('X')) {
      let a = 0, b = 0, cv = 0;
      const terms = expr.replace(/([+-])/g, ' $1').trim().split(/\s+/);
      for (const term of terms) {
        if (term.includes('X')) {
          const coeff = term.replace('X', '').replace('*', '');
          a = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseNum(coeff);
        } else if (term.includes('x')) {
          const coeff = term.replace('x', '').replace('*', '');
          b = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseNum(coeff);
        } else {
          cv = parseNum(term);
        }
      }
      if (!isNaN(a)) {
        return { fn: (x) => a * x * x + b * x + cv, condition, color: c };
      }
    }
  }

  // Try exponential: a*b^x+c or b^x+c
  {
    // Case 1: a*b^x+c or a*(b)^x+c
    const m1 = cleaned.match(new RegExp(`^${numStr}[\\*\\(]${numStr}\\)?\\^x([+-]\\d*\\.?\\d*(?:\\/\\d+)?)?$`));
    if (m1) {
      const a = parseNum(m1[1]);
      const b = parseNum(m1[2]);
      const k = m1[3] ? parseNum(m1[3]) : 0;
      if (!isNaN(a) && !isNaN(b) && !isNaN(k)) {
        return { fn: (x) => a * Math.pow(b, x) + k, condition, color: c };
      }
    }
    // Case 2: b^x+c or (b)^x+c
    const m2 = cleaned.match(new RegExp(`^\\(?${numStr}\\)?\\^x([+-]\\d*\\.?\\d*(?:\\/\\d+)?)?$`));
    if (m2) {
      const b = parseNum(m2[1]);
      const k = m2[2] ? parseNum(m2[2]) : 0;
      if (!isNaN(b) && !isNaN(k)) {
        return { fn: (x) => Math.pow(b, x) + k, condition, color: c };
      }
    }
  }

  // Try absolute value: a*|x-h|+k or |x|
  {
    const m = cleaned.match(new RegExp(`^${numStr}\\*?\\|x([+-]\\d*\\.?\\d*(?:\\/\\d+)?)?\\|([+-]\\d*\\.?\\d*(?:\\/\\d+)?)?$`));
    if (m) {
      const a = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : parseNum(m[1]);
      const h = m[2] ? -parseNum(m[2]) : 0;
      const k = m[3] ? parseNum(m[3]) : 0;
      if (!isNaN(a)) return { fn: (x) => a * Math.abs(x - h) + k, condition, color: c };
    }
  }

  // Try rational function: a/(x-h)^2 + k
  {
    // Needs to match: -1/(x-4)^2+2
    const m = cleaned.match(new RegExp(`^${numStr}\\/\\(x([+-]\\d*\\.?\\d*(?:\\/\\d+)?)\\)\\^2([+-]\\d*\\.?\\d*(?:\\/\\d+)?)?$`));
    if (m) {
      const a = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : parseNum(m[1]);
      const h = -parseNum(m[2]);
      const k = m[3] ? parseNum(m[3]) : 0;
      if (!isNaN(a) && !isNaN(h) && !isNaN(k)) {
        return {
          fn: (x) => {
            const denom = Math.pow(x - h, 2);
            if (Math.abs(denom) < 0.0001) return a > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
            return (a / denom) + k;
          }, condition, color: c
        };
      }
    }
  }

  // Try linear: mx+b
  {
    const terms = cleaned.replace(/([+-])/g, ' $1').trim().split(/\s+/);
    let m = 0, b = 0;
    let hasX = false;
    for (const term of terms) {
      if (term.includes('x')) {
        hasX = true;
        const coeff = term.replace('x', '').replace('*', '');
        m = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseNum(coeff);
      } else {
        b = parseNum(term);
      }
    }
    if (!hasX) {
      const val = parseNum(cleaned);
      if (!isNaN(val)) return { fn: () => val, condition, color: c };
    }
    if (hasX && !isNaN(m)) {
      return { fn: (x) => m * x + b, condition, color: c };
    }
  }

  return null;
}
