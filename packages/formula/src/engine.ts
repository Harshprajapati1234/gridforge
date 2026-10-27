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
        const n = Number(val);
        return node.op === '-' ? -n : n;
      }

      case 'binary': {
        let left = this.evaluateAst(node.left, ctx);
        let right = this.evaluateAst(node.right, ctx);
        if (isExcelError(left)) return left;
        if (isExcelError(right)) return right;
        if (Array.isArray(left)) left = (left as any).flat(Infinity)[0];
        if (Array.isArray(right)) right = (right as any).flat(Infinity)[0];

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
