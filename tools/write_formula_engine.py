import os
import json

base_dir = "/Users/sanctuarian/Downloads/Link-Sheet-v4/gridforge"
files = {}

# 1. packages/formula/package.json
files["packages/formula/package.json"] = json.dumps({
  "name": "@gridforge/formula",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@gridforge/shared": "workspace:*"
  }
}, indent=2)

files["packages/formula/tsconfig.json"] = json.dumps({
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src/**/*"]
}, indent=2)

# 2. types.ts
files["packages/formula/src/types.ts"] = """export type FormulaValue = string | number | boolean | null | ExcelError;

export interface ExcelError {
  isError: true;
  code: '#REF!' | '#NAME?' | '#VALUE!' | '#DIV/0!' | '#N/A' | '#NUM!' | '#CIRC!' | '#NULL!';
}

export function isExcelError(val: unknown): val is ExcelError {
  return typeof val === 'object' && val !== null && (val as any).isError === true;
}

export function makeError(code: ExcelError['code']): ExcelError {
  return { isError: true, code };
}

export interface CellCoord {
  sheet?: string;
  r: number;
  c: number;
}

export interface RangeCoord {
  sheet?: string;
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

export type ASTNode =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'error'; code: ExcelError['code'] }
  | { type: 'reference'; coord: CellCoord }
  | { type: 'range'; range: RangeCoord }
  | { type: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'unary'; op: string; operand: ASTNode }
  | { type: 'function'; name: string; args: ASTNode[] };

export interface EvalContext {
  getCellValue(sheet: string | undefined, r: number, c: number): FormulaValue;
  getRangeValues(sheet: string | undefined, r0: number, c0: number, r1: number, c1: number): FormulaValue[][];
}

export type FunctionHandler = (args: FormulaValue[], ctx: EvalContext) => FormulaValue;

export interface FormulaEngine {
  parse(formula: string): ASTNode;
  evaluate(formula: string, ctx: EvalContext): FormulaValue;
  evaluateAst(ast: ASTNode, ctx: EvalContext): FormulaValue;
  dependencies(formula: string): { cells: CellCoord[]; ranges: RangeCoord[] };
  registerFunction(name: string, handler: FunctionHandler): void;
  getFunctionNames(): string[];
}
"""

# 3. parser.ts
files["packages/formula/src/parser.ts"] = """import { ASTNode, CellCoord, RangeCoord, makeError } from './types';

const RE_NUM = /^(\\d+\\.?\\d*|\\.\\d+)([eE][+-]?\\d+)?/;
const RE_REF = /^(\\$?)([A-Za-z]+)(\\$?)(\\d+)/;

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
    while (pos < len && /\\s/.test(text[pos])) pos++;
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
    const idMatch = /^[A-Za-z_][\\w.]*/.exec(rest);
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

      // Boolean
      if (id.toUpperCase() === 'TRUE') return { type: 'boolean', value: true };
      if (id.toUpperCase() === 'FALSE') return { type: 'boolean', value: false };

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
"""

# 4. dep-graph.ts
files["packages/formula/src/dep-graph.ts"] = """import { ASTNode, CellCoord, RangeCoord } from './types';

export class DependencyExtractor {
  static extract(ast: ASTNode): { cells: CellCoord[]; ranges: RangeCoord[] } {
    const cells: CellCoord[] = [];
    const ranges: RangeCoord[] = [];

    function traverse(node: ASTNode) {
      if (!node) return;
      if (node.type === 'reference') {
        cells.push(node.coord);
      } else if (node.type === 'range') {
        ranges.push(node.range);
      } else if (node.type === 'binary') {
        traverse(node.left);
        traverse(node.right);
      } else if (node.type === 'unary') {
        traverse(node.operand);
      } else if (node.type === 'function') {
        node.args.forEach(traverse);
      }
    }

    traverse(ast);
    return { cells, ranges };
  }
}

export class DependencyGraph {
  // node -> dependent nodes
  private dependents: Map<string, Set<string>> = new Map();
  // node -> dependency nodes
  private dependencies: Map<string, Set<string>> = new Map();

  key(sheet = 'default', r: number, c: number): string {
    return `${sheet}!${r},${c}`;
  }

  setFormulaDeps(sheet = 'default', r: number, c: number, cells: CellCoord[], ranges: RangeCoord[]): void {
    const targetKey = this.key(sheet, r, c);

    // Clear old dependencies
    const oldDeps = this.dependencies.get(targetKey);
    if (oldDeps) {
      for (const d of oldDeps) {
        this.dependents.get(d)?.delete(targetKey);
      }
    }

    const newDeps = new Set<string>();
    for (const cell of cells) {
      newDeps.add(this.key(cell.sheet || sheet, cell.r, cell.c));
    }
    for (const rg of ranges) {
      for (let cr = rg.r0; cr <= rg.r1; cr++) {
        for (let cc = rg.c0; cc <= rg.c1; cc++) {
          newDeps.add(this.key(rg.sheet || sheet, cr, cc));
        }
      }
    }

    this.dependencies.set(targetKey, newDeps);
    for (const d of newDeps) {
      if (!this.dependents.has(d)) this.dependents.set(d, new Set());
      this.dependents.get(d)!.add(targetKey);
    }
  }

  hasCycle(startKey: string): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const check = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);
      const nexts = this.dependencies.get(node);
      if (nexts) {
        for (const n of nexts) {
          if (!visited.has(n) && check(n)) return true;
          else if (recStack.has(n)) return true;
        }
      }
      recStack.delete(node);
      return false;
    };

    return check(startKey);
  }

  getAffectedOrder(startKey: string): string[] {
    const order: string[] = [];
    const visited = new Set<string>();

    const dfs = (node: string) => {
      visited.add(node);
      const deps = this.dependents.get(node);
      if (deps) {
        for (const dep of deps) {
          if (!visited.has(dep)) dfs(dep);
        }
      }
      order.push(node);
    };

    dfs(startKey);
    return order.reverse();
  }
}
"""

# 5. function-library.ts
files["packages/formula/src/function-library.ts"] = """import { FormulaValue, FunctionHandler, isExcelError, makeError, EvalContext } from './types';

export const standardFunctions: Record<string, FunctionHandler> = {
  // --- Math ---
  SUM: (args) => {
    let sum = 0;
    for (const a of args) {
      if (isExcelError(a)) return a;
      if (typeof a === 'number') sum += a;
      else if (typeof a === 'string') {
        const n = Number(a);
        if (!isNaN(n)) sum += n;
      }
    }
    return sum;
  },
  AVERAGE: (args) => {
    let sum = 0, count = 0;
    for (const a of args) {
      if (isExcelError(a)) return a;
      if (typeof a === 'number') { sum += a; count++; }
      else if (typeof a === 'string') {
        const n = Number(a);
        if (!isNaN(n)) { sum += n; count++; }
      }
    }
    return count > 0 ? sum / count : makeError('#DIV/0!');
  },
  MIN: (args) => {
    let min: number | null = null;
    for (const a of args) {
      if (isExcelError(a)) return a;
      const n = typeof a === 'number' ? a : (typeof a === 'string' && !isNaN(Number(a)) ? Number(a) : null);
      if (n != null) min = min == null ? n : Math.min(min, n);
    }
    return min != null ? min : 0;
  },
  MAX: (args) => {
    let max: number | null = null;
    for (const a of args) {
      if (isExcelError(a)) return a;
      const n = typeof a === 'number' ? a : (typeof a === 'string' && !isNaN(Number(a)) ? Number(a) : null);
      if (n != null) max = max == null ? n : Math.max(max, n);
    }
    return max != null ? max : 0;
  },
  ABS: (args) => {
    const n = Number(args[0]);
    return isNaN(n) ? makeError('#VALUE!') : Math.abs(n);
  },
  ROUND: (args) => {
    const n = Number(args[0]);
    const d = args[1] != null ? Number(args[1]) : 0;
    if (isNaN(n) || isNaN(d)) return makeError('#VALUE!');
    const f = Math.pow(10, d);
    return Math.round(n * f) / f;
  },
  ROUNDUP: (args) => {
    const n = Number(args[0]);
    const d = args[1] != null ? Number(args[1]) : 0;
    const f = Math.pow(10, d);
    return Math.sign(n) * Math.ceil(Math.abs(n) * f) / f;
  },
  ROUNDDOWN: (args) => {
    const n = Number(args[0]);
    const d = args[1] != null ? Number(args[1]) : 0;
    const f = Math.pow(10, d);
    return Math.sign(n) * Math.floor(Math.abs(n) * f) / f;
  },
  INT: (args) => Math.floor(Number(args[0])),
  MOD: (args) => {
    const a = Number(args[0]), b = Number(args[1]);
    return b === 0 ? makeError('#DIV/0!') : a % b;
  },
  POWER: (args) => Math.pow(Number(args[0]), Number(args[1])),
  SQRT: (args) => {
    const n = Number(args[0]);
    return n < 0 ? makeError('#NUM!') : Math.sqrt(n);
  },
  PRODUCT: (args) => args.reduce((p, a) => (typeof a === 'number' ? p * a : p), 1),
  SIGN: (args) => Math.sign(Number(args[0])),

  // --- Logic ---
  IF: (args) => (args[0] ? args[1] : (args.length > 2 ? args[2] : false)),
  IFERROR: (args) => (isExcelError(args[0]) ? args[1] : args[0]),
  IFNA: (args) => (isExcelError(args[0]) && args[0].code === '#N/A' ? args[1] : args[0]),
  AND: (args) => args.every(Boolean),
  OR: (args) => args.some(Boolean),
  NOT: (args) => !Boolean(args[0]),

  // --- Text ---
  CONCAT: (args) => args.map((a) => (a != null ? String(a) : '')).join(''),
  CONCATENATE: (args) => args.map((a) => (a != null ? String(a) : '')).join(''),
  LEFT: (args) => {
    const s = String(args[0] ?? '');
    const n = args[1] != null ? Number(args[1]) : 1;
    return s.slice(0, Math.max(0, n));
  },
  RIGHT: (args) => {
    const s = String(args[0] ?? '');
    const n = args[1] != null ? Number(args[1]) : 1;
    return n <= 0 ? '' : s.slice(-n);
  },
  MID: (args) => {
    const s = String(args[0] ?? '');
    const start = Number(args[1]) - 1;
    const len = Number(args[2]);
    return start < 0 ? makeError('#VALUE!') : s.substr(start, Math.max(0, len));
  },
  LEN: (args) => String(args[0] ?? '').length,
  TRIM: (args) => String(args[0] ?? '').trim().replace(/\\s+/g, ' '),
  UPPER: (args) => String(args[0] ?? '').toUpperCase(),
  LOWER: (args) => String(args[0] ?? '').toLowerCase(),
  PROPER: (args) => String(args[0] ?? '').toLowerCase().replace(/(^|[^a-z0-9])([a-z])/g, (_, a, b) => a + b.toUpperCase()),
  SUBSTITUTE: (args) => {
    const s = String(args[0] ?? ''), target = String(args[1] ?? ''), repl = String(args[2] ?? '');
    return s.split(target).join(repl);
  },
  TEXTJOIN: (args) => {
    const delim = String(args[0] ?? '');
    const ignoreEmpty = Boolean(args[1]);
    const items = args.slice(2).flat();
    return items.filter((x) => !ignoreEmpty || (x != null && x !== '')).join(delim);
  },
  EXACT: (args) => String(args[0] ?? '') === String(args[1] ?? ''),
  REPT: (args) => String(args[0] ?? '').repeat(Math.max(0, Math.min(10000, Number(args[1])))),

  // --- Counting & Statistics ---
  COUNT: (args) => args.filter((a) => typeof a === 'number' || (typeof a === 'string' && !isNaN(Number(a)))).length,
  COUNTA: (args) => args.filter((a) => a != null && a !== '').length,
  COUNTBLANK: (args) => args.filter((a) => a == null || a === '').length,

  // --- Information ---
  ISBLANK: (args) => args[0] == null || args[0] === '',
  ISNUMBER: (args) => typeof args[0] === 'number',
  ISTEXT: (args) => typeof args[0] === 'string',
  ISERROR: (args) => isExcelError(args[0]),
  ISNA: (args) => isExcelError(args[0]) && args[0].code === '#N/A',
  ISLOGICAL: (args) => typeof args[0] === 'boolean',
  NA: () => makeError('#N/A')
};
"""

# 6. engine.ts
files["packages/formula/src/engine.ts"] = """import {
  FormulaEngine,
  ASTNode,
  FormulaValue,
  EvalContext,
  FunctionHandler,
  makeError,
  isExcelError
} from './types';
import { parseFormula } from './parser';
import { DependencyExtractor } from './dep-graph';
import { standardFunctions } from './function-library';

export class DefaultFormulaEngine implements FormulaEngine {
  private functions: Map<string, FunctionHandler> = new Map();

  constructor() {
    // Register standard Excel functions
    for (const [name, fn] of Object.entries(standardFunctions)) {
      this.functions.set(name, fn);
    }
  }

  registerFunction(name: string, handler: FunctionHandler): void {
    this.functions.set(name.toUpperCase(), handler);
  }

  getFunctionNames(): string[] {
    return Array.from(this.functions.keys());
  }

  parse(formula: string): ASTNode {
    return parseFormula(formula);
  }

  dependencies(formula: string) {
    const ast = this.parse(formula);
    return DependencyExtractor.extract(ast);
  }

  evaluate(formula: string, ctx: EvalContext): FormulaValue {
    const ast = this.parse(formula);
    return this.evaluateAst(ast, ctx);
  }

  evaluateAst(node: ASTNode, ctx: EvalContext): FormulaValue {
    if (!node) return null;

    switch (node.type) {
      case 'number':
      case 'string':
      case 'boolean':
        return node.value;

      case 'error':
        return makeError(node.code);

      case 'reference':
        return ctx.getCellValue(node.coord.sheet, node.coord.r, node.coord.c);

      case 'range': {
        const vals = ctx.getRangeValues(node.range.sheet, node.range.r0, node.range.c0, node.range.r1, node.range.c1);
        return vals.flat() as any;
      }

      case 'unary': {
        const val = this.evaluateAst(node.operand, ctx);
        if (isExcelError(val)) return val;
        const n = Number(val);
        return node.op === '-' ? -n : n;
      }

      case 'binary': {
        const left = this.evaluateAst(node.left, ctx);
        const right = this.evaluateAst(node.right, ctx);
        if (isExcelError(left)) return left;
        if (isExcelError(right)) return right;

        const op = node.op;
        if (op === '&') return String(left ?? '') + String(right ?? '');
        if (op === '=') return left === right;
        if (op === '<>') return left !== right;
        if (op === '<') return (left as any) < (right as any);
        if (op === '>') return (left as any) > (right as any);
        if (op === '<=') return (left as any) <= (right as any);
        if (op === '>=') return (left as any) >= (right as any);

        const a = Number(left);
        const b = Number(right);
        if (isNaN(a) || isNaN(b)) return makeError('#VALUE!');

        switch (op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return b === 0 ? makeError('#DIV/0!') : a / b;
          case '^': return Math.pow(a, b);
        }
        return makeError('#VALUE!');
      }

      case 'function': {
        const fn = this.functions.get(node.name);
        if (!fn) return makeError('#NAME?');

        // Evaluate argument expressions (flatten ranges where appropriate)
        const evaluatedArgs: FormulaValue[] = [];
        for (const arg of node.args) {
          const val = this.evaluateAst(arg, ctx);
          if (Array.isArray(val)) {
            evaluatedArgs.push(...val);
          } else {
            evaluatedArgs.push(val);
          }
        }

        try {
          return fn(evaluatedArgs, ctx);
        } catch {
          return makeError('#VALUE!');
        }
      }
    }
  }
}
"""

files["packages/formula/src/index.ts"] = """export * from './types';
export * from './parser';
export * from './dep-graph';
export * from './function-library';
export * from './engine';
"""

# Write all to disk
for rel_path, content in files.items():
  full_path = os.path.join(base_dir, rel_path)
  os.makedirs(os.path.dirname(full_path), exist_ok=True)
  with open(full_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Successfully generated {len(files)} Formula engine files.")
