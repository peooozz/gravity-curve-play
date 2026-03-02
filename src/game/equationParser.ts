import { EquationType } from './types';

interface ParsedEquation {
  type: EquationType;
  fn: (x: number) => number;
  display: string;
}

export function parseEquation(input: string): ParsedEquation | null {
  const cleaned = input.replace(/\s+/g, '').toLowerCase();
  
  // Remove y= prefix if present
  let expr = cleaned.startsWith('y=') ? cleaned.slice(2) : cleaned;
  
  // Try sinusoidal: A*sin(Bx+C) or sin(x) variations
  const sinMatch = expr.match(
    /^([+-]?\d*\.?\d*)\*?sin\(([+-]?\d*\.?\d*)\*?x([+-]\d*\.?\d*)?\)([+-]\d*\.?\d*)?$/
  );
  if (sinMatch || expr === 'sin(x)' || /^sin\(x\)/.test(expr)) {
    if (expr === 'sin(x)') {
      return { type: 'sinusoidal', fn: (x) => Math.sin(x), display: 'y = sin(x)' };
    }
    // Try simple sin(x) + C
    const simpleMatch = expr.match(/^sin\(x\)([+-]\d*\.?\d*)$/);
    if (simpleMatch) {
      const c = parseFloat(simpleMatch[1]) || 0;
      return { type: 'sinusoidal', fn: (x) => Math.sin(x) + c, display: `y = sin(x) + ${c}` };
    }
    if (sinMatch) {
      const A = sinMatch[1] === '' || sinMatch[1] === '+' ? 1 : sinMatch[1] === '-' ? -1 : parseFloat(sinMatch[1]);
      const B = sinMatch[2] === '' || sinMatch[2] === undefined ? 1 : parseFloat(sinMatch[2]);
      const C = sinMatch[3] ? parseFloat(sinMatch[3]) : 0;
      const D = sinMatch[4] ? parseFloat(sinMatch[4]) : 0;
      if (isNaN(A) || isNaN(B) || isNaN(C) || isNaN(D)) return null;
      return {
        type: 'sinusoidal',
        fn: (x) => A * Math.sin(B * x + C) + D,
        display: `y = ${A}·sin(${B}x + ${C}) + ${D}`,
      };
    }
  }

  // Try quadratic: ax^2 + bx + c
  // Replace x^2 with a token
  let quadExpr = expr.replace(/x\^2/g, 'X');
  
  if (quadExpr.includes('X')) {
    // Parse coefficients
    let a = 0, b = 0, c = 0;
    // Extract all terms
    const terms = quadExpr.replace(/([+-])/g, ' $1').trim().split(/\s+/);
    for (const term of terms) {
      if (term.includes('X')) {
        const coeff = term.replace('X', '').replace('*', '');
        a = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseFloat(coeff);
      } else if (term.includes('x')) {
        const coeff = term.replace('x', '').replace('*', '');
        b = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseFloat(coeff);
      } else {
        const val = parseFloat(term);
        if (!isNaN(val)) c = val;
      }
    }
    if (isNaN(a)) return null;
    return {
      type: 'quadratic',
      fn: (x) => a * x * x + b * x + c,
      display: `y = ${a}x² + ${b}x + ${c}`,
    };
  }

  // Try linear: mx + b
  {
    const terms = expr.replace(/([+-])/g, ' $1').trim().split(/\s+/);
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
    if (!hasX && !isNaN(parseFloat(expr))) {
      // Constant function
      const val = parseFloat(expr);
      return { type: 'linear', fn: () => val, display: `y = ${val}` };
    }
    if (hasX && !isNaN(m)) {
      return {
        type: 'linear',
        fn: (x) => m * x + b,
        display: `y = ${m}x + ${b}`,
      };
    }
  }

  return null;
}
