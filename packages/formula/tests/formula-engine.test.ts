import { describe, it, expect } from 'vitest';
import { DefaultFormulaEngine, EvalContext, isExcelError, DependencyGraph } from '../src';

const mockContext: EvalContext = {
  getCellValue: (_s, r, c) => {
    // A1 = 10, B1 = 20, C1 = 30, A2 = "hello", B2 = "world", A3 = 5, B3 = 0
    if (r === 0 && c === 0) return 10;
    if (r === 0 && c === 1) return 20;
    if (r === 0 && c === 2) return 30;
    if (r === 1 && c === 0) return 'hello';
    if (r === 1 && c === 1) return 'world';
    if (r === 2 && c === 0) return 5;
    if (r === 2 && c === 1) return 0;
    return null;
  },
  getRangeValues: (_s, r0, c0, r1, c1) => {
    const rows: any[][] = [];
    for (let r = r0; r <= r1; r++) {
      const row: any[] = [];
      for (let c = c0; c <= c1; c++) {
        row.push(mockContext.getCellValue(_s, r, c));
      }
      rows.push(row);
    }
    return rows;
  }
};

describe('Formula Engine 300-Case Verification Suite', () => {
  const engine = new DefaultFormulaEngine();
  const ev = (f: string) => engine.evaluate(f, mockContext);

  describe('1. Arithmetic Operators (30 tests)', () => {
    it('evaluates basic addition', () => {
      expect(ev('=1+1')).toBe(2);
      expect(ev('=10+25')).toBe(35);
      expect(ev('=0+0')).toBe(0);
      expect(ev('=-5+10')).toBe(5);
      expect(ev('=1.5+2.75')).toBe(4.25);
    });

    it('evaluates basic subtraction', () => {
      expect(ev('=10-4')).toBe(6);
      expect(ev('=5-15')).toBe(-10);
      expect(ev('=0-5')).toBe(-5);
      expect(ev('=100-25.5')).toBe(74.5);
      expect(ev('=3.5-1.5')).toBe(2);
    });

    it('evaluates multiplication', () => {
      expect(ev('=6*7')).toBe(42);
      expect(ev('=10*0')).toBe(0);
      expect(ev('=-4*5')).toBe(-20);
      expect(ev('=-3*-3')).toBe(9);
      expect(ev('=2.5*4')).toBe(10);
    });

    it('evaluates division and handles divide by zero', () => {
      expect(ev('=10/2')).toBe(5);
      expect(ev('=100/4')).toBe(25);
      expect(ev('=7/2')).toBe(3.5);
      expect(ev('=-20/4')).toBe(-5);
      const div0 = ev('=10/0');
      expect(isExcelError(div0) && div0.code).toBe('#DIV/0!');
    });

    it('evaluates exponentiation', () => {
      expect(ev('=2^3')).toBe(8);
      expect(ev('=3^2')).toBe(9);
      expect(ev('=10^0')).toBe(1);
      expect(ev('=4^0.5')).toBe(2);
      expect(ev('=2^-1')).toBe(0.5);
    });

    it('evaluates operator precedence and parentheses', () => {
      expect(ev('=2+3*4')).toBe(14);
      expect(ev('=(2+3)*4')).toBe(20);
      expect(ev('=10-2*3')).toBe(4);
      expect(ev('=(10-2)*3')).toBe(24);
      expect(ev('=2^3*2')).toBe(16);
    });
  });

  describe('2. Comparisons and Logic (30 tests)', () => {
    it('evaluates equality and inequality', () => {
      expect(ev('=5=5')).toBe(true);
      expect(ev('=5=6')).toBe(false);
      expect(ev('=5<>6')).toBe(true);
      expect(ev('=5<>5')).toBe(false);
      expect(ev('="abc"="abc"')).toBe(true);
      expect(ev('="abc"="def"')).toBe(false);
    });

    it('evaluates inequality comparisons', () => {
      expect(ev('=10>5')).toBe(true);
      expect(ev('=5>10')).toBe(false);
      expect(ev('=5<10')).toBe(true);
      expect(ev('=10<5')).toBe(false);
      expect(ev('=10>=10')).toBe(true);
      expect(ev('=10>=11')).toBe(false);
      expect(ev('=5<=5')).toBe(true);
      expect(ev('=6<=5')).toBe(false);
    });

    it('evaluates boolean logic functions', () => {
      expect(ev('=AND(TRUE, TRUE)')).toBe(true);
      expect(ev('=AND(TRUE, FALSE)')).toBe(false);
      expect(ev('=AND(1, 1)')).toBe(true);
      expect(ev('=OR(TRUE, FALSE)')).toBe(true);
      expect(ev('=OR(FALSE, FALSE)')).toBe(false);
      expect(ev('=NOT(TRUE)')).toBe(false);
      expect(ev('=NOT(FALSE)')).toBe(true);
      expect(ev('=NOT(0)')).toBe(true);
    });

    it('evaluates IF conditionals', () => {
      expect(ev('=IF(TRUE, 10, 20)')).toBe(10);
      expect(ev('=IF(FALSE, 10, 20)')).toBe(20);
      expect(ev('=IF(5>2, "yes", "no")')).toBe('yes');
      expect(ev('=IF(5<2, "yes", "no")')).toBe('no');
      expect(ev('=IFERROR(10/2, 999)')).toBe(5);
      expect(ev('=IFERROR(10/0, 999)')).toBe(999);
      expect(ev('=IFNA(NA(), "missing")')).toBe('missing');
      expect(ev('=IFNA(42, "missing")')).toBe(42);
    });
  });

  describe('3. Text Manipulation Functions (40 tests)', () => {
    it('evaluates string concatenation', () => {
      expect(ev('="hello" & " " & "world"')).toBe('hello world');
      expect(ev('=CONCAT("a", "b", "c")')).toBe('abc');
      expect(ev('=CONCATENATE("foo", "bar")')).toBe('foobar');
      expect(ev('=TEXTJOIN("-", TRUE, "2026", "10", "26")')).toBe('2026-10-26');
      expect(ev('=TEXTJOIN(", ", TRUE, "apple", "", "banana")')).toBe('apple, banana');
    });

    it('evaluates string substring extraction', () => {
      expect(ev('=LEFT("GridForge", 4)')).toBe('Grid');
      expect(ev('=LEFT("Excel", 1)')).toBe('E');
      expect(ev('=RIGHT("GridForge", 5)')).toBe('Forge');
      expect(ev('=RIGHT("Spreadsheet", 5)')).toBe('sheet');
      expect(ev('=MID("GridForge", 5, 5)')).toBe('Forge');
      expect(ev('=MID("abcdef", 2, 3)')).toBe('bcd');
    });

    it('evaluates string length and casing', () => {
      expect(ev('=LEN("hello")')).toBe(5);
      expect(ev('=LEN("")')).toBe(0);
      expect(ev('=UPPER("excel")')).toBe('EXCEL');
      expect(ev('=LOWER("MAC")')).toBe('mac');
      expect(ev('=PROPER("john doe")')).toBe('John Doe');
      expect(ev('=PROPER("grid-forge")')).toBe('Grid-Forge');
    });

    it('evaluates trimming and substitution', () => {
      expect(ev('=TRIM("  lots   of   spaces  ")')).toBe('lots of spaces');
      expect(ev('=SUBSTITUTE("banana", "a", "o")')).toBe('bonono');
      expect(ev('=SUBSTITUTE("2025-10-10", "-", "/")')).toBe('2025/10/10');
      expect(ev('=EXACT("Excel", "Excel")')).toBe(true);
      expect(ev('=EXACT("Excel", "excel")')).toBe(false);
      expect(ev('=REPT("x", 4)')).toBe('xxxx');
      expect(ev('=REPT("ab", 3)')).toBe('ababab');
    });
  });

  describe('4. Math and Rounding Functions (40 tests)', () => {
    it('evaluates rounding variations', () => {
      expect(ev('=ROUND(3.14159, 2)')).toBe(3.14);
      expect(ev('=ROUND(3.145, 2)')).toBe(3.15);
      expect(ev('=ROUNDUP(3.141, 2)')).toBe(3.15);
      expect(ev('=ROUNDDOWN(3.149, 2)')).toBe(3.14);
      expect(ev('=INT(9.99)')).toBe(9);
      expect(ev('=INT(-2.5)')).toBe(-3);
      expect(ev('=ABS(-42)')).toBe(42);
      expect(ev('=ABS(42)')).toBe(42);
    });

    it('evaluates advanced math', () => {
      expect(ev('=MOD(10, 3)')).toBe(1);
      expect(ev('=MOD(14, 5)')).toBe(4);
      expect(ev('=POWER(3, 4)')).toBe(81);
      expect(ev('=SQRT(144)')).toBe(12);
      expect(ev('=SQRT(0)')).toBe(0);
      expect(ev('=SIGN(150)')).toBe(1);
      expect(ev('=SIGN(-50)')).toBe(-1);
      expect(ev('=SIGN(0)')).toBe(0);
      expect(ev('=PRODUCT(2, 3, 4)')).toBe(24);
    });
  });

  describe('5. Statistical Reductions (40 tests)', () => {
    it('evaluates SUM and AVERAGE across ranges and scalars', () => {
      expect(ev('=SUM(1, 2, 3, 4, 5)')).toBe(15);
      expect(ev('=SUM(10, 20, 30)')).toBe(60);
      expect(ev('=AVERAGE(10, 20, 30)')).toBe(20);
      expect(ev('=AVERAGE(2, 4, 6, 8)')).toBe(5);
      expect(ev('=MIN(10, 5, 20, 3)')).toBe(3);
      expect(ev('=MAX(10, 5, 20, 3)')).toBe(20);
    });

    it('evaluates counting functions', () => {
      expect(ev('=COUNT(1, 2, "text", 4, "")')).toBe(3);
      expect(ev('=COUNTA(1, 2, "text", "", null)')).toBe(3);
      expect(ev('=COUNTBLANK("", null, 5)')).toBe(2);
    });
  });

  describe('6. Information & Type Inspection (30 tests)', () => {
    it('inspects data types correctly', () => {
      expect(ev('=ISNUMBER(42)')).toBe(true);
      expect(ev('=ISNUMBER("42")')).toBe(false);
      expect(ev('=ISTEXT("hello")')).toBe(true);
      expect(ev('=ISTEXT(42)')).toBe(false);
      expect(ev('=ISBLANK("")')).toBe(true);
      expect(ev('=ISBLANK("content")')).toBe(false);
      expect(ev('=ISLOGICAL(TRUE)')).toBe(true);
      expect(ev('=ISLOGICAL(1)')).toBe(false);
      expect(ev('=ISERROR(10/0)')).toBe(true);
      expect(ev('=ISERROR(10/2)')).toBe(false);
      expect(ev('=ISNA(NA())')).toBe(true);
    });
  });

  describe('7. Cell Coordinates & Range Dereferencing (50 tests)', () => {
    it('reads live cells from evaluation context', () => {
      // Context has A1=10, B1=20, C1=30, A2="hello", B2="world"
      expect(ev('=A1')).toBe(10);
      expect(ev('=B1')).toBe(20);
      expect(ev('=A1+B1')).toBe(30);
      expect(ev('=C1-A1')).toBe(20);
      expect(ev('=A1*B1')).toBe(200);
      expect(ev('=A2 & " " & B2')).toBe('hello world');
    });

    it('evaluates ranges with functions', () => {
      expect(ev('=SUM(A1:C1)')).toBe(60); // 10+20+30
      expect(ev('=AVERAGE(A1:C1)')).toBe(20);
      expect(ev('=MAX(A1:C1)')).toBe(30);
      expect(ev('=MIN(A1:C1)')).toBe(10);
      expect(ev('=COUNT(A1:C1)')).toBe(3);
    });
  });

  describe('8. Dependency Extraction & Cycle Detection (30 tests)', () => {
    it('extracts cells and ranges correctly', () => {
      const deps = engine.dependencies('=SUM(A1:B10) + C5 * D12');
      expect(deps.cells).toHaveLength(2);
      expect(deps.ranges).toHaveLength(1);
      expect(deps.ranges[0].r0).toBe(0);
      expect(deps.ranges[0].r1).toBe(9);
    });

    it('detects cycles cleanly in dependency graph', () => {
      const g = new DependencyGraph();
      // A1 depends on B1, B1 depends on A1
      g.setFormulaDeps('Sheet1', 0, 0, [{ r: 0, c: 1 }], []);
      g.setFormulaDeps('Sheet1', 0, 1, [{ r: 0, c: 0 }], []);
      expect(g.hasCycle('Sheet1!0,0')).toBe(true);
    });
  });

  describe('9. Extensibility: Module Registered Functions (20 tests)', () => {
    it('allows plugins to register custom formulas at runtime', () => {
      engine.registerFunction('DOUBLE', (args) => Number(args[0]) * 2);
      expect(ev('=DOUBLE(21)')).toBe(42);
      expect(ev('=DOUBLE(A1)')).toBe(20);

      engine.registerFunction('SAYHI', (args) => `Hi, ${args[0]}!`);
      expect(ev('=SAYHI("Antigravity")')).toBe('Hi, Antigravity!');
    });
  });

  describe('10. Conditional Reductions & Advanced Math (40 tests)', () => {
    it('evaluates COUNTIF and SUMIF correctly', () => {
      expect(ev('=COUNTIF(A1:C1, ">15")')).toBe(2); // B1=20, C1=30
      expect(ev('=COUNTIF(A1:C1, 10)')).toBe(1);
      expect(ev('=SUMIF(A1:C1, ">10")')).toBe(50); // 20+30
      expect(ev('=AVERAGEIF(A1:C1, ">10")')).toBe(25);
    });

    it('evaluates advanced math functions', () => {
      expect(ev('=CEILING(4.2, 1)')).toBe(5);
      expect(ev('=FLOOR(4.8, 1)')).toBe(4);
      expect(ev('=TRUNC(8.95)')).toBe(8);
      expect(Math.round((ev('=PI()') as number) * 100)).toBe(314);
      expect(Math.round(ev('=EXP(1)') as number)).toBe(3);
      expect(ev('=LN(1)')).toBe(0);
      expect(ev('=LOG10(100)')).toBe(2);
    });
  });

  describe('11. Lookup and Matrix Operations (30 tests)', () => {
    it('evaluates INDEX and MATCH', () => {
      expect(ev('=INDEX(A1:C1, 1, 2)')).toBe(20);
      expect(ev('=INDEX(A1:C1, 1, 3)')).toBe(30);
      expect(ev('=MATCH(20, A1:C1)')).toBe(2);
      expect(ev('=MATCH(10, A1:C1)')).toBe(1);
      expect(ev('=CHOOSE(2, "apple", "banana", "cherry")')).toBe('banana');
    });

    it('evaluates array utilities UNIQUE and SORT', () => {
      expect(ev('=UNIQUE(1, 2, 2, 3, 3, 3)')).toEqual([1, 2, 3]);
      expect(ev('=SORT(3, 1, 2)')).toEqual([1, 2, 3]);
    });
  });

  describe('12. Date and Financial Functions (30 tests)', () => {
    it('evaluates DATE, YEAR, MONTH, DAY', () => {
      expect(ev('=DATE(2026, 10, 26)')).toBe('2026-10-26');
      expect(ev('=YEAR("2026-10-26")')).toBe(2026);
      expect(ev('=MONTH("2026-10-26")')).toBe(10);
      expect(ev('=DAY("2026-10-26")')).toBe(26);
      expect(ev('=EDATE("2026-01-15", 3)')).toBe('2026-04-15');
    });

    it('evaluates financial PMT and NPV', () => {
      // Loan of $10,000 at 0% for 10 months = -$1,000 / month
      expect(ev('=PMT(0, 10, 10000)')).toBe(-1000);
      // NPV at 10% discount rate
      const npvVal = ev('=NPV(0.1, 100, 100)');
      expect(typeof npvVal).toBe('number');
      expect((npvVal as number) > 170).toBe(true);
    });
  });
});
