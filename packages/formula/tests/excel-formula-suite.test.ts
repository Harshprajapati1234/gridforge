import { describe, it, expect } from 'vitest';
import { DefaultFormulaEngine, EvalContext, isExcelError } from '../src';

const mockContext: EvalContext = {
  getCellValue: (_s, r, c) => {
    // Sheet1 Grid:
    // Row 0 (1): A1=10, B1=20, C1=30, D1=40, E1=50
    // Row 1 (2): A2="apple", B2="banana", C2="CHERRY", D2="apple", E2=""
    // Row 2 (3): A3=true, B3=false, C3=null (blank), D3=0, E3=100
    // Row 3 (4): A4="10", B4="20", C4="text", D4=null (blank), E4=null (blank)
    // Row 4 (5): A5=5, B5=15, C5=25, D5=35, E5=45
    if (r === 0) {
      if (c === 0) return 10;
      if (c === 1) return 20;
      if (c === 2) return 30;
      if (c === 3) return 40;
      if (c === 4) return 50;
    }
    if (r === 1) {
      if (c === 0) return 'apple';
      if (c === 1) return 'banana';
      if (c === 2) return 'CHERRY';
      if (c === 3) return 'apple';
      if (c === 4) return '';
    }
    if (r === 2) {
      if (c === 0) return true;
      if (c === 1) return false;
      if (c === 2) return null; // Blank cell C3
      if (c === 3) return 0;
      if (c === 4) return 100;
    }
    if (r === 3) {
      if (c === 0) return '10';
      if (c === 1) return '20';
      if (c === 2) return 'text';
      if (c === 3) return null; // Blank cell D4
      if (c === 4) return null; // Blank cell E4
    }
    if (r === 4) {
      if (c === 0) return 5;
      if (c === 1) return 15;
      if (c === 2) return 25;
      if (c === 3) return 35;
      if (c === 4) return 45;
    }
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

describe('Excel Formula Specification Verification Suite (≥300 Cases)', () => {
  const engine = new DefaultFormulaEngine();
  const ev = (formula: string) => engine.evaluate(formula, mockContext);

  describe('1. Case-Insensitive String Comparisons & Equality (30 cases)', () => {
    const tests = [
      ['="a"="A"', true],
      ['="hello"="HELLO"', true],
      ['="GridForge"="gridforge"', true],
      ['="Excel"="EXCEL"', true],
      ['="UPPER"="upper"', true],
      ['="test"="Test"', true],
      ['="a"<>"A"', false],
      ['="apple"<>"APPLE"', false],
      ['="a"<>"b"', true],
      ['="alpha"<>"beta"', true],
      ['="abc"<"DEF"', true],
      ['="def">"ABC"', true],
      ['="a"<"B"', true],
      ['="b">"A"', true],
      ['="apple"<="banana"', true],
      ['="banana">="apple"', true],
      ['="same"<="SAME"', true],
      ['="SAME">="same"', true],
      ['="foo"="bar"', false],
      ['="123"="123"', true],
      ['=B2="BANANA"', true], // B2 is "banana"
      ['=C2="cherry"', true], // C2 is "CHERRY"
      ['=A2=D2', true],       // A2 and D2 both "apple"
      ['=A2<>B2', true],      // "apple" <> "banana"
      ['="micro"<="MICROSOFT"', true],
      ['="test"="   test   "', false],
      ['="xyz">"XYZ"', false],
      ['="xyz"<"XYZ"', false],
      ['="xyz">="XYZ"', true],
      ['="xyz"<="XYZ"', true]
    ];
    tests.forEach(([f, expected], idx) => {
      it(`Case ${idx + 1}: ${f}`, () => {
        expect(ev(f as string)).toBe(expected);
      });
    });
  });

  describe('2. Text vs Number Type Hierarchy Comparisons (30 cases)', () => {
    // Excel rule: Numbers < Text < Booleans
    const tests = [
      ['=1000<"a"', true],
      ['=0<"0"', true],
      ['=-999<""', true],
      ['=99999<" "', true],
      ['="a">1000', true],
      ['="0">0', true],
      ['="" > -100', true],
      ['=500000<"apple"', true],
      ['="apple">99999999', true],
      ['=100="100"', false],
      ['=0=""', false],
      ['=100<>"100"', true],
      ['=0<>""', true],
      ['="z"<TRUE', true],
      ['="hello"<FALSE', true],
      ['=""<TRUE', true],
      ['=TRUE>"z"', true],
      ['=FALSE>""', true],
      ['=1000<TRUE', true],
      ['=0<FALSE', true],
      ['=TRUE>1000', true],
      ['=FALSE>0', true],
      ['=1=TRUE', false],
      ['=0=FALSE', false],
      ['=1<>TRUE', true],
      ['=0<>FALSE', true],
      ['="TRUE"=TRUE', false],
      ['="FALSE"=FALSE', false],
      ['="TRUE"<>TRUE', true],
      ['="FALSE"<>FALSE', true]
    ];
    tests.forEach(([f, expected], idx) => {
      it(`Hierarchy ${idx + 1}: ${f}`, () => {
        expect(ev(f as string)).toBe(expected);
      });
    });
  });

  describe('3. Blank Cell Semantics in Arithmetic & Logic (30 cases)', () => {
    // In mock context: C3 is blank (null), D4 is blank (null), E4 is blank (null)
    const tests = [
      ['=C3+5', 5],
      ['=10-C3', 10],
      ['=C3*100', 0],
      ['=C3/4', 0],
      ['=C3^2', 0],
      ['=-C3', 0],
      ['=+C3', 0],
      ['=C3 & "hello"', 'hello'],
      ['="world" & C3', 'world'],
      ['=C3 & D4', ''],
      ['=C3=0', true],
      ['=C3=""', true],
      ['=C3<1', true],
      ['=C3>-1', true],
      ['=C3<=0', true],
      ['=C3>=0', true],
      ['=C3=D4', true],
      ['=AND(TRUE, C3)', true],
      ['=AND(FALSE, C3)', false],
      ['=OR(TRUE, C3)', true],
      ['=OR(FALSE, C3)', false],
      ['=NOT(C3)', true],
      ['=IF(C3, 10, 20)', 20],
      ['=IF(NOT(C3), 10, 20)', 10],
      ['=C3+D4', 0],
      ['=C3*D4', 0],
      ['=A1+C3', 10], // A1=10 + C3(blank)=10
      ['=B1*C3', 0],  // B1=20 * C3(blank)=0
      ['=C3<>1', true],
      ['=C3<>"abc"', true]
    ];
    tests.forEach(([f, expected], idx) => {
      it(`Blank Semantics ${idx + 1}: ${f}`, () => {
        expect(ev(f as string)).toBe(expected);
      });
    });
  });

  describe('4. Basic Arithmetic & Precedence (40 cases)', () => {
    const tests = [
      ['=1+1', 2],
      ['=2+3*4', 14],
      ['=(2+3)*4', 20],
      ['=10-4-2', 4],
      ['=10-(4-2)', 8],
      ['=2^3', 8],
      ['=2^3^2', 64], // Left-assoc in parser or 512
      ['=100/10/2', 5],
      ['=100/(10/2)', 20],
      ['=-5+10', 5],
      ['=-(5+10)', -15],
      ['=--5', 5],
      ['=2.5+3.75', 6.25],
      ['=10-15', -5],
      ['=3*0', 0],
      ['=0*100', 0],
      ['=0/10', 0],
      ['=12/3', 4],
      ['=15/2', 7.5],
      ['=2^0', 1],
      ['=0^5', 0],
      ['=4^0.5', 2],
      ['=27^(1/3)', 3],
      ['=10+20*3-5', 65],
      ['=(10+20)*(3-5)', -60],
      ['=100-50-20-10', 20],
      ['=1+2+3+4+5', 15],
      ['=2*3*4', 24],
      ['=1000/10/10', 10],
      ['=100/(5*2)', 10],
      ['=5+ -3', 2],
      ['=5- -3', 8],
      ['=-2*-3', 6],
      ['=-10/2', -5],
      ['=10/-2', -5],
      ['=-10/-2', 5],
      ['=2^4', 16],
      ['=3^3', 27],
      ['=10^2', 100],
      ['=10^-1', 0.1]
    ];
    tests.forEach(([f, expected], idx) => {
      it(`Arithmetic ${idx + 1}: ${f}`, () => {
        const res = ev(f as string);
        if (typeof expected === 'number') {
          expect(Math.abs((res as number) - expected)).toBeLessThan(1e-5);
        } else {
          expect(res).toBe(expected);
        }
      });
    });
  });

  describe('5. Math & Rounding Functions (40 cases)', () => {
    const tests = [
      ['=ROUND(3.14159, 2)', 3.14],
      ['=ROUND(3.145, 2)', 3.15],
      ['=ROUND(25.5, 0)', 26],
      ['=ROUND(-1.5, 0)', -2],
      ['=ROUNDUP(3.141, 2)', 3.15],
      ['=ROUNDUP(3.001, 1)', 3.1],
      ['=ROUNDDOWN(3.149, 2)', 3.14],
      ['=ROUNDDOWN(3.999, 0)', 3],
      ['=INT(9.99)', 9],
      ['=INT(-2.5)', -3],
      ['=ABS(-42)', 42],
      ['=ABS(42)', 42],
      ['=ABS(0)', 0],
      ['=MOD(10, 3)', 1],
      ['=MOD(14, 5)', 4],
      ['=MOD(-10, 3)', 2],
      ['=POWER(2, 5)', 32],
      ['=POWER(10, 3)', 1000],
      ['=SQRT(144)', 12],
      ['=SQRT(0)', 0],
      ['=SIGN(150)', 1],
      ['=SIGN(-50)', -1],
      ['=SIGN(0)', 0],
      ['=PRODUCT(2, 3, 4)', 24],
      ['=PRODUCT(5, 10)', 50],
      ['=CEILING(4.2, 1)', 5],
      ['=CEILING(4.01, 1)', 5],
      ['=FLOOR(4.8, 1)', 4],
      ['=FLOOR(4.99, 1)', 4],
      ['=TRUNC(8.95)', 8],
      ['=TRUNC(-8.95)', -8],
      ['=LN(1)', 0],
      ['=LOG10(100)', 2],
      ['=LOG10(1000)', 3],
      ['=EXP(0)', 1],
      ['=SQRT(25)', 5],
      ['=ROUND(1234.567, -2)', 1200],
      ['=ROUND(1250, -2)', 1300],
      ['=ABS(-0.5)', 0.5],
      ['=PRODUCT(1, 2, 3, 4, 5)', 120]
    ];
    tests.forEach(([f, expected], idx) => {
      it(`Math ${idx + 1}: ${f}`, () => {
        expect(ev(f as string)).toBe(expected);
      });
    });
  });

  describe('6. Statistical Reductions (35 cases)', () => {
    const tests = [
      ['=SUM(1, 2, 3, 4, 5)', 15],
      ['=SUM(10, 20, 30)', 60],
      ['=SUM(A1:E1)', 150], // 10+20+30+40+50
      ['=AVERAGE(10, 20, 30)', 20],
      ['=AVERAGE(A1:E1)', 30],
      ['=MIN(10, 5, 20, 3)', 3],
      ['=MIN(A1:E1)', 10],
      ['=MAX(10, 5, 20, 3)', 20],
      ['=MAX(A1:E1)', 50],
      ['=COUNT(1, 2, "text", 4, "")', 3],
      ['=COUNT(A1:E1)', 5],
      ['=COUNTA(1, 2, "text", "", null)', 3],
      ['=COUNTBLANK("", null, 5)', 2],
      ['=COUNTIF(A1:E1, ">25")', 3], // 30, 40, 50
      ['=COUNTIF(A1:E1, 10)', 1],
      ['=SUMIF(A1:E1, ">20")', 120], // 30+40+50
      ['=SUMIF(A1:E1, "<=30")', 60],  // 10+20+30
      ['=AVERAGEIF(A1:E1, ">20")', 40], // (30+40+50)/3 = 40
      ['=MEDIAN(1, 2, 3, 4, 5)', 3],
      ['=MEDIAN(1, 2, 3, 4)', 2.5],
      ['=LARGE(A1:E1, 1)', 50],
      ['=LARGE(A1:E1, 2)', 40],
      ['=LARGE(A1:E1, 3)', 30],
      ['=SMALL(A1:E1, 1)', 10],
      ['=SMALL(A1:E1, 2)', 20],
      ['=SMALL(A1:E1, 3)', 30],
      ['=SUM(A5:E5)', 125], // 5+15+25+35+45
      ['=AVERAGE(A5:E5)', 25],
      ['=MIN(A5:E5)', 5],
      ['=MAX(A5:E5)', 45],
      ['=SUM(A1, B1, C1)', 60],
      ['=AVERAGE(A1, B1, C1)', 20],
      ['=COUNT(A1, B1, "hello")', 2],
      ['=MAX(100, 200, 50)', 200],
      ['=MIN(100, 200, 50)', 50]
    ];
    tests.forEach(([f, expected], idx) => {
      it(`Stats ${idx + 1}: ${f}`, () => {
        expect(ev(f as string)).toBe(expected);
      });
    });
  });

  describe('7. Text Functions (45 cases)', () => {
    const tests = [
      ['="hello" & " " & "world"', 'hello world'],
      ['=CONCAT("a", "b", "c")', 'abc'],
      ['=CONCATENATE("foo", "bar")', 'foobar'],
      ['=TEXTJOIN("-", TRUE, "2026", "10", "27")', '2026-10-27'],
      ['=TEXTJOIN(", ", TRUE, "apple", "", "banana")', 'apple, banana'],
      ['=LEFT("GridForge", 4)', 'Grid'],
      ['=LEFT("Excel", 1)', 'E'],
      ['=LEFT("Test", 10)', 'Test'],
      ['=RIGHT("GridForge", 5)', 'Forge'],
      ['=RIGHT("Spreadsheet", 5)', 'sheet'],
      ['=RIGHT("Test", 10)', 'Test'],
      ['=MID("GridForge", 5, 5)', 'Forge'],
      ['=MID("abcdef", 2, 3)', 'bcd'],
      ['=LEN("hello")', 5],
      ['=LEN("")', 0],
      ['=LEN("   ")', 3],
      ['=UPPER("excel")', 'EXCEL'],
      ['=UPPER("GridForge")', 'GRIDFORGE'],
      ['=LOWER("MAC")', 'mac'],
      ['=LOWER("GridForge")', 'gridforge'],
      ['=PROPER("john doe")', 'John Doe'],
      ['=PROPER("grid-forge app")', 'Grid-Forge App'],
      ['=TRIM("  lots   of   spaces  ")', 'lots of spaces'],
      ['=SUBSTITUTE("banana", "a", "o")', 'bonono'],
      ['=SUBSTITUTE("2026-10-27", "-", "/")', '2026/10/27'],
      ['=REPLACE("abcdef", 2, 3, "XYZ")', 'aXYZef'],
      ['=EXACT("Excel", "Excel")', true],
      ['=EXACT("Excel", "excel")', false],
      ['=REPT("x", 4)', 'xxxx'],
      ['=REPT("ab", 3)', 'ababab'],
      ['=FIND("d", "GridForge")', 4],
      ['=FIND("F", "GridForge")', 5],
      ['=SEARCH("forge", "GridForge")', 5],
      ['=SEARCH("GRID", "GridForge")', 1],
      ['=CHAR(65)', 'A'],
      ['=CHAR(97)', 'a'],
      ['=CODE("A")', 65],
      ['=CODE("a")', 97],
      ['=A2 & " pie"', 'apple pie'],
      ['=UPPER(A2)', 'APPLE'],
      ['=LOWER(C2)', 'cherry'],
      ['=LEN(A2)', 5],
      ['=LEFT(A2, 3)', 'app'],
      ['=RIGHT(B2, 3)', 'ana'],
      ['=MID(B2, 2, 4)', 'anan']
    ];
    tests.forEach(([f, expected], idx) => {
      it(`Text ${idx + 1}: ${f}`, () => {
        expect(ev(f as string)).toBe(expected);
      });
    });
  });

  describe('8. Logical Functions (30 cases)', () => {
    const tests = [
      ['=IF(TRUE, 10, 20)', 10],
      ['=IF(FALSE, 10, 20)', 20],
      ['=IF(5>2, "yes", "no")', 'yes'],
      ['=IF(5<2, "yes", "no")', 'no'],
      ['=IFERROR(10/2, 999)', 5],
      ['=IFERROR(10/0, 999)', 999],
      ['=IFNA(NA(), "missing")', 'missing'],
      ['=IFNA(42, "missing")', 42],
      ['=AND(TRUE, TRUE)', true],
      ['=AND(TRUE, FALSE)', false],
      ['=AND(FALSE, FALSE)', false],
      ['=AND(1, 1)', true],
      ['=AND(1, 0)', false],
      ['=OR(TRUE, FALSE)', true],
      ['=OR(FALSE, FALSE)', false],
      ['=OR(1, 0)', true],
      ['=OR(0, 0)', false],
      ['=NOT(TRUE)', false],
      ['=NOT(FALSE)', true],
      ['=NOT(0)', true],
      ['=NOT(1)', false],
      ['=XOR(TRUE, FALSE)', true],
      ['=XOR(TRUE, TRUE)', false],
      ['=XOR(FALSE, FALSE)', false],
      ['=SWITCH(2, 1, "one", 2, "two", "other")', 'two'],
      ['=SWITCH(5, 1, "one", 2, "two", "other")', 'other'],
      ['=IF(1=1, "equal", "not equal")', 'equal'],
      ['=IF("a"="A", "match", "no")', 'match'],
      ['=AND(5>2, 10>5)', true],
      ['=OR(5>10, 10>5)', true]
    ];
    tests.forEach(([f, expected], idx) => {
      it(`Logic ${idx + 1}: ${f}`, () => {
        expect(ev(f as string)).toBe(expected);
      });
    });
  });

  describe('9. Lookup & Reference Functions (30 cases)', () => {
    const tests = [
      ['=INDEX(A1:E1, 1, 1)', 10],
      ['=INDEX(A1:E1, 1, 3)', 30],
      ['=INDEX(A1:E1, 1, 5)', 50],
      ['=MATCH(30, A1:E1)', 3],
      ['=MATCH(10, A1:E1)', 1],
      ['=MATCH(50, A1:E1)', 5],
      ['=CHOOSE(1, "gold", "silver", "bronze")', 'gold'],
      ['=CHOOSE(2, "gold", "silver", "bronze")', 'silver'],
      ['=CHOOSE(3, "gold", "silver", "bronze")', 'bronze'],
      ['=INDEX(A5:E5, 1, 2)', 15],
      ['=INDEX(A5:E5, 1, 4)', 35],
      ['=MATCH(25, A5:E5)', 3],
      ['=MATCH(45, A5:E5)', 5],
      ['=CHOOSE(2, 100, 200, 300)', 200],
      ['=INDEX(A1:E1, 1, 2)', 20],
      ['=MATCH(20, A1:E1)', 2],
      ['=MATCH(40, A1:E1)', 4],
      ['=CHOOSE(1, "A", "B")', 'A'],
      ['=CHOOSE(2, "A", "B")', 'B'],
      ['=INDEX(A1:E1, 1, 4)', 40],
      ['=INDEX(A5:E5, 1, 1)', 5],
      ['=INDEX(A5:E5, 1, 3)', 25],
      ['=INDEX(A5:E5, 1, 5)', 45],
      ['=MATCH(5, A5:E5)', 1],
      ['=MATCH(15, A5:E5)', 2],
      ['=MATCH(35, A5:E5)', 4],
      ['=CHOOSE(3, 10, 20, 30, 40)', 30],
      ['=CHOOSE(4, 10, 20, 30, 40)', 40],
      ['=INDEX(A1:E5, 1, 1)', 10],
      ['=INDEX(A1:E5, 5, 5)', 45]
    ];
    tests.forEach(([f, expected], idx) => {
      it(`Lookup ${idx + 1}: ${f}`, () => {
        expect(ev(f as string)).toBe(expected);
      });
    });
  });

  describe('10. Date & Time Functions (20 cases)', () => {
    const tests = [
      ['=DATE(2026, 10, 27)', '2026-10-27'],
      ['=DATE(2025, 1, 15)', '2025-01-15'],
      ['=YEAR("2026-10-27")', 2026],
      ['=YEAR("2024-05-12")', 2024],
      ['=MONTH("2026-10-27")', 10],
      ['=MONTH("2025-03-08")', 3],
      ['=DAY("2026-10-27")', 27],
      ['=DAY("2025-03-08")', 8],
      ['=EDATE("2026-01-15", 3)', '2026-04-15'],
      ['=EDATE("2026-05-20", 2)', '2026-07-20'],
      ['=EOMONTH("2026-01-15", 0)', '2026-01-31'],
      ['=EOMONTH("2026-02-10", 0)', '2026-02-28'],
      ['=DATE(2026, 12, 31)', '2026-12-31'],
      ['=YEAR("2030-01-01")', 2030],
      ['=MONTH("2030-12-25")', 12],
      ['=DAY("2030-12-25")', 25],
      ['=EDATE("2026-10-10", 1)', '2026-11-10'],
      ['=EOMONTH("2026-03-01", 0)', '2026-03-31'],
      ['=DATE(2027, 7, 4)', '2027-07-04'],
      ['=MONTH("2027-07-04")', 7]
    ];
    tests.forEach(([f, expected], idx) => {
      it(`Date ${idx + 1}: ${f}`, () => {
        expect(ev(f as string)).toBe(expected);
      });
    });
  });

  describe('11. Modern Array & Matrix Utilities (15 cases)', () => {
    it('UNIQUE deduplicates scalar arrays', () => {
      expect(ev('=UNIQUE(1, 2, 2, 3, 3, 3)')).toEqual([1, 2, 3]);
      expect(ev('=UNIQUE("a", "b", "a", "c")')).toEqual(['a', 'b', 'c']);
      expect(ev('=UNIQUE(10, 10, 10)')).toEqual([10]);
    });

    it('SORT orders arrays ascending and descending', () => {
      expect(ev('=SORT(3, 1, 2)')).toEqual([1, 2, 3]);
      expect(ev('=SORT(3, 1, 2, -1)')).toEqual([3, 2, 1]);
      expect(ev('=SORT("b", "c", "a")')).toEqual(['a', 'b', 'c']);
    });

    it('SEQUENCE generates matrices', () => {
      expect(ev('=SEQUENCE(3, 1, 1, 1)')).toEqual([[1], [2], [3]]);
      expect(ev('=SEQUENCE(2, 2, 10, 5)')).toEqual([[10, 15], [20, 25]]);
      expect(ev('=SEQUENCE(1, 3, 1, 1)')).toEqual([[1, 2, 3]]);
    });

    it('TRANSPOSE inverts matrix dimensions', () => {
      expect(ev('=TRANSPOSE(A1:B1)')).toEqual([[10], [20]]);
      expect(ev('=TRANSPOSE(1)')).toBe(1);
    });

    it('Array compositions work seamlessly', () => {
      expect(ev('=SORT(UNIQUE(5, 2, 5, 1, 2))')).toEqual([1, 2, 5]);
      expect(ev('=SUM(SEQUENCE(5, 1, 1, 1))')).toBe(15);
      expect(ev('=AVERAGE(SEQUENCE(5, 1, 1, 1))')).toBe(3);
    });
  });

  describe('12. Financial Modeling & Error Propagation (15 cases)', () => {
    it('PMT calculates correct loan installments', () => {
      expect(ev('=PMT(0, 10, 10000)')).toBe(-1000);
      expect(ev('=PMT(0, 5, 500)')).toBe(-100);
    });

    it('NPV calculates discounted cash flows', () => {
      const npv = ev('=NPV(0.1, 100, 100)') as number;
      expect(npv).toBeGreaterThan(170);
      expect(npv).toBeLessThan(175);
    });

    it('Propagates division by zero error #DIV/0!', () => {
      const err = ev('=10/0');
      expect(isExcelError(err) && err.code).toBe('#DIV/0!');
      const nested = ev('=1 + (10/0)');
      expect(isExcelError(nested) && nested.code).toBe('#DIV/0!');
    });

    it('Propagates value error #VALUE!', () => {
      const err = ev('="abc" + 5');
      expect(isExcelError(err) && err.code).toBe('#VALUE!');
    });

    it('Propagates missing lookup error #N/A', () => {
      const err = ev('=MATCH(9999, A1:E1)');
      expect(isExcelError(err) && err.code).toBe('#N/A');
    });

    it('Handles unknown functions with #NAME?', () => {
      const err = ev('=UNKNOWN_FN(123)');
      expect(isExcelError(err) && err.code).toBe('#NAME?');
    });

    it('Handles NA() standard function', () => {
      const err = ev('=NA()');
      expect(isExcelError(err) && err.code).toBe('#N/A');
    });

    it('Handles SQRT of negative numbers with #NUM!', () => {
      const err = ev('=SQRT(-16)');
      expect(isExcelError(err) && err.code).toBe('#NUM!');
    });

    it('Handles index out of bounds with #REF!', () => {
      const err = ev('=INDEX(A1:E1, 1, 99)');
      expect(isExcelError(err) && err.code).toBe('#REF!');
    });

    it('ISERROR and ISNA correctly detect propagated error states', () => {
      expect(ev('=ISERROR(10/0)')).toBe(true);
      expect(ev('=ISERROR(5+5)')).toBe(false);
      expect(ev('=ISNA(NA())')).toBe(true);
      expect(ev('=ISNA(10/0)')).toBe(false);
    });
  });
});
