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
    const m = cleaned.match(/^([+-]?\d*\.?\d*)\*?sin\(([+-]?\d*\.?\d*)\*?x([+-]\d*\.?\d*)?\)([+-]\d*\.?\d*)?$/);
    if (cleaned === 'sin(x)') return { fn: Math.sin, condition, color: c };
    const simple = cleaned.match(/^sin\(x\)([+-]\d*\.?\d*)$/);
    if (simple) {
      const d = parseFloat(simple[1]) || 0;
      return { fn: (x) => Math.sin(x) + d, condition, color: c };
    }
    if (m) {
      const A = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : parseFloat(m[1]);
      const B = !m[2] || m[2] === '' ? 1 : parseFloat(m[2]);
      const C = m[3] ? parseFloat(m[3]) : 0;
      const D = m[4] ? parseFloat(m[4]) : 0;
      if ([A, B, C, D].some(isNaN)) return null;
      return { fn: (x) => A * Math.sin(B * x + C) + D, condition, color: c };
    }
  }

  // Try cos
  if (cleaned.includes('cos(')) {
    const m = cleaned.match(/^([+-]?\d*\.?\d*)\*?cos\(([+-]?\d*\.?\d*)\*?x([+-]\d*\.?\d*)?\)([+-]\d*\.?\d*)?$/);
    if (cleaned === 'cos(x)') return { fn: Math.cos, condition, color: c };
    if (m) {
      const A = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : parseFloat(m[1]);
      const B = !m[2] || m[2] === '' ? 1 : parseFloat(m[2]);
      const C = m[3] ? parseFloat(m[3]) : 0;
      const D = m[4] ? parseFloat(m[4]) : 0;
      if ([A, B, C, D].some(isNaN)) return null;
      return { fn: (x) => A * Math.cos(B * x + C) + D, condition, color: c };
    }
  }

  // Try vertex form: a(x-h)^2+k
  {
    const m = cleaned.match(/^([+-]?\d*\.?\d*)\(x([+-]\d*\.?\d*)\)\^2([+-]\d*\.?\d*)?$/);
    if (m) {
      const a = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : parseFloat(m[1]);
      const h = -(parseFloat(m[2]) || 0); // x+(-4) means h=4, so negate
      const k = m[3] ? parseFloat(m[3]) : 0;
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
          a = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseFloat(coeff);
        } else if (term.includes('x')) {
          const coeff = term.replace('x', '').replace('*', '');
          b = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseFloat(coeff);
        } else {
          const val = parseFloat(term);
          if (!isNaN(val)) cv = val;
        }
      }
      if (!isNaN(a)) {
        return { fn: (x) => a * x * x + b * x + cv, condition, color: c };
      }
    }
  }

  // Try absolute value: a*|x-h|+k or |x|
  {
    const m = cleaned.match(/^([+-]?\d*\.?\d*)\*?\|x([+-]\d*\.?\d*)?\|([+-]\d*\.?\d*)?$/);
    if (m) {
      const a = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : parseFloat(m[1]);
      const h = m[2] ? -(parseFloat(m[2]) || 0) : 0;
      const k = m[3] ? parseFloat(m[3]) : 0;
      if (!isNaN(a)) return { fn: (x) => a * Math.abs(x - h) + k, condition, color: c };
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
        m = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseFloat(coeff);
      } else {
        const val = parseFloat(term);
        if (!isNaN(val)) b = val;
      }
    }
    if (!hasX && !isNaN(parseFloat(cleaned))) {
      const val = parseFloat(cleaned);
      return { fn: () => val, condition, color: c };
    }
    if (hasX && !isNaN(m)) {
      return { fn: (x) => m * x + b, condition, color: c };
    }
  }

  return null;
}
