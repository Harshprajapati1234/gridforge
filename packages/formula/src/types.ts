export type FormulaPrimitive = string | number | boolean | null | ExcelError;
export type FormulaValue =
  | FormulaPrimitive
  | FormulaPrimitive[]
  | FormulaPrimitive[][]
  | any[]
  | any[][];

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
  | { type: 'null' }
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
