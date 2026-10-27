import {
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

function coerceToNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '') return 0;
    const n = Number(trimmed);
    return isNaN(n) ? NaN : n;
  }
  if (val instanceof Date) return val.getTime();
  return NaN;
}

function getTypeOrder(v: any): number {
  if (typeof v === 'number') return 1;
  if (typeof v === 'string') return 2;
  if (typeof v === 'boolean') return 3;
  return 0;
}

function compareValues(a: any, b: any, op: string): boolean {
  if (typeof a === 'string' && typeof b === 'string') {
    const sA = a.toUpperCase();
    const sB = b.toUpperCase();
    switch (op) {
      case '=': return sA === sB;
      case '<>': return sA !== sB;
      case '<': return sA < sB;
      case '<=': return sA <= sB;
      case '>': return sA > sB;
      case '>=': return sA >= sB;
    }
  }

  if (typeof a === 'boolean' && typeof b === 'boolean') {
    const nA = a ? 1 : 0;
    const nB = b ? 1 : 0;
    switch (op) {
      case '=': return nA === nB;
      case '<>': return nA !== nB;
      case '<': return nA < nB;
      case '<=': return nA <= nB;
      case '>': return nA > nB;
      case '>=': return nA >= nB;
    }
  }

  const nA = Number(a);
  const nB = Number(b);
  switch (op) {
    case '=': return nA === nB;
    case '<>': return nA !== nB;
    case '<': return nA < nB;
    case '<=': return nA <= nB;
    case '>': return nA > nB;
    case '>=': return nA >= nB;
  }
  return false;
}

function compareExcel(left: any, right: any, op: string): boolean {
  const leftNull = left === null || left === undefined;
  const rightNull = right === null || right === undefined;

  if (leftNull && rightNull) {
    if (op === '=' || op === '<=' || op === '>=') return true;
    if (op === '<>' || op === '<' || op === '>') return false;
  }

  if (leftNull) {
    if (typeof right === 'number') {
      return compareValues(0, right, op);
    }
    if (typeof right === 'string') {
      return compareValues('', right, op);
    }
    if (typeof right === 'boolean') {
      if (op === '=') return false;
      if (op === '<>') return true;
      return compareValues(0, right ? 1 : 0, op);
    }
  }

  if (rightNull) {
    if (typeof left === 'number') {
      return compareValues(left, 0, op);
    }
    if (typeof left === 'string') {
      return compareValues(left, '', op);
    }
    if (typeof left === 'boolean') {
      if (op === '=') return false;
      if (op === '<>') return true;
      return compareValues(left ? 1 : 0, 0, op);
    }
  }

  const leftType = getTypeOrder(left);
  const rightType = getTypeOrder(right);

  if (leftType !== rightType) {
    if (op === '=') return false;
    if (op === '<>') return true;
    if (op === '<' || op === '<=') return leftType < rightType;
    if (op === '>' || op === '>=') return leftType > rightType;
  }

  return compareValues(left, right, op);
}

export class DefaultFormulaEngine implements FormulaEngine {
  private functions: Map<string, FunctionHandler> = new Map();

  constructor() {
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

      case 'null':
        return null;

      case 'error':
        return makeError(node.code);

      case 'reference':
        return ctx.getCellValue(node.coord.sheet, node.coord.r, node.coord.c);

      case 'range': {
        return ctx.getRangeValues(node.range.sheet, node.range.r0, node.range.c0, node.range.r1, node.range.c1) as any;
      }

      case 'unary': {
        const val = this.evaluateAst(node.operand, ctx);
        if (isExcelError(val)) return val;
        const n = coerceToNumber(val);
        if (isNaN(n)) return makeError('#VALUE!');
        const res = node.op === '-' ? -n : n;
        return res === 0 ? 0 : res;
      }

      case 'binary': {
        let left = this.evaluateAst(node.left, ctx);
        let right = this.evaluateAst(node.right, ctx);
        if (isExcelError(left)) return left;
        if (isExcelError(right)) return right;
        if (Array.isArray(left)) left = (left as any).flat(Infinity)[0];
        if (Array.isArray(right)) right = (right as any).flat(Infinity)[0];

        const op = node.op;
        if (op === '&') {
          const lStr = left == null ? '' : String(left);
          const rStr = right == null ? '' : String(right);
          return lStr + rStr;
        }

        if (op === '=' || op === '<>' || op === '<' || op === '>' || op === '<=' || op === '>=') {
          return compareExcel(left, right, op);
        }

        const a = coerceToNumber(left);
        const b = coerceToNumber(right);
        if (isNaN(a) || isNaN(b)) return makeError('#VALUE!');

        switch (op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return b === 0 ? makeError('#DIV/0!') : a / b;
          case '^': return b < 0 && a === 0 ? makeError('#DIV/0!') : Math.pow(a, b);
        }
        return makeError('#VALUE!');
      }

      case 'function': {
        const fn = this.functions.get(node.name);
        if (!fn) return makeError('#NAME?');

        const evaluatedArgs: FormulaValue[] = [];
        for (const arg of node.args) {
          const val = this.evaluateAst(arg, ctx);
          evaluatedArgs.push(val);
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
