import { ASTNode, CellCoord, RangeCoord, makeError } from './types';

const RE_NUM = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/;
const RE_REF = /^(\$?)([A-Za-z]+)(\$?)(\d+)/;

export function colToNum(colStr: string): number {
  let num = 0;
  for (const ch of colStr.toUpperCase()) {
    num = num * 26 + (ch.charCodeAt(0) - 64);
  }
  return num - 1;
}

export function parseFormula(src: string): ASTNode {
  let text = src.trim();
  if (text.startsWith('=')) text = text.slice(1).trim();

  let pos = 0;
  const len = text.length;

  function peek(): string {
    while (pos < len && /\s/.test(text[pos])) pos++;
    return pos < len ? text[pos] : '';
  }

  function parseExpression(): ASTNode {
    return parseComparison();
  }

  function parseComparison(): ASTNode {
    let left = parseConcat();
    while (true) {
      const rest = text.slice(pos).trimStart();
      const match = /^(<=|>=|<>|=|<|>)/.exec(rest);
      if (match) {
        pos += (text.slice(pos).length - rest.length) + match[0].length;
        const right = parseConcat();
        left = { type: 'binary', op: match[0], left, right };
      } else {
        break;
      }
    }
    return left;
  }

  function parseConcat(): ASTNode {
    let left = parseAddSub();
    while (peek() === '&') {
      pos++;
      const right = parseAddSub();
      left = { type: 'binary', op: '&', left, right };
    }
    return left;
  }

  function parseAddSub(): ASTNode {
    let left = parseMulDiv();
    while (peek() === '+' || peek() === '-') {
      const op = text[pos++];
      const right = parseMulDiv();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  function parseMulDiv(): ASTNode {
    let left = parsePower();
    while (peek() === '*' || peek() === '/') {
      const op = text[pos++];
      const right = parsePower();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  function parsePower(): ASTNode {
    let left = parseUnary();
    while (peek() === '^') {
      pos++;
      const right = parseUnary();
      left = { type: 'binary', op: '^', left, right };
    }
    return left;
  }

  function parseUnary(): ASTNode {
    const ch = peek();
    if (ch === '-' || ch === '+') {
      pos++;
      const operand = parseUnary();
      return { type: 'unary', op: ch, operand };
    }
    return parsePrimary();
  }

  function parsePrimary(): ASTNode {
    peek();
    const rest = text.slice(pos);

    // Parentheses
    if (text[pos] === '(') {
      pos++;
      const expr = parseExpression();
      if (peek() === ')') pos++;
      return expr;
    }

    // String literal
    if (text[pos] === '"') {
      pos++;
      let str = '';
      while (pos < len) {
        if (text[pos] === '"') {
          if (text[pos + 1] === '"') {
            str += '"';
            pos += 2;
          } else {
            pos++;
            break;
          }
        } else {
          str += text[pos++];
        }
      }
      return { type: 'string', value: str };
    }

    // Number literal
    const numMatch = RE_NUM.exec(rest);
    if (numMatch) {
      pos += numMatch[0].length;
      return { type: 'number', value: parseFloat(numMatch[0]) };
    }

    // Boolean or Function or Reference
    const idMatch = /^[A-Za-z_][\w.]*/.exec(rest);
    if (idMatch) {
      const id = idMatch[0];
      pos += id.length;

      // Function call
      if (peek() === '(') {
        pos++;
        const args: ASTNode[] = [];
        if (peek() !== ')') {
          while (true) {
            args.push(parseExpression());
            const nextCh = peek();
            if (nextCh === ',') pos++;
            else if (nextCh === ')') { pos++; break; }
            else break;
          }
        } else {
          pos++;
        }
        return { type: 'function', name: id.toUpperCase(), args };
      }

      // Boolean or Null
      if (id.toUpperCase() === 'TRUE') return { type: 'boolean', value: true };
      if (id.toUpperCase() === 'FALSE') return { type: 'boolean', value: false };
      if (id.toUpperCase() === 'NULL') return { type: 'null' };

      // Reference (A1, $B$10) or Range (A1:B10)
      const refMatch = RE_REF.exec(id);
      if (refMatch) {
        const c0 = colToNum(refMatch[2]);
        const r0 = parseInt(refMatch[4], 10) - 1;

        if (peek() === ':') {
          pos++;
          const rightRest = text.slice(pos).trimStart();
          const rightMatch = RE_REF.exec(rightRest);
          if (rightMatch) {
            pos += (text.slice(pos).length - rightRest.length) + rightMatch[0].length;
            const c1 = colToNum(rightMatch[2]);
            const r1 = parseInt(rightMatch[4], 10) - 1;
            return {
              type: 'range',
              range: {
                r0: Math.min(r0, r1),
                c0: Math.min(c0, c1),
                r1: Math.max(r0, r1),
                c1: Math.max(c0, c1)
              }
            };
          }
        }

        return { type: 'reference', coord: { r: r0, c: c0 } };
      }
    }

    pos++;
    return { type: 'error', code: '#VALUE!' };
  }

  try {
    return parseExpression();
  } catch {
    return { type: 'error', code: '#NAME?' };
  }
}
