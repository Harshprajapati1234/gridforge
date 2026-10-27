import { FormulaValue, FunctionHandler, isExcelError, makeError, EvalContext } from './types';

function toNum(v: any): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.trim());
    if (!isNaN(n)) return n;
  }
  if (v instanceof Date) return v.getTime();
  return NaN;
}

function parseDate(v: any): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === 'number') {
    // Excel serial date: days since 1899-12-30
    const ms = (v - 25569) * 86400 * 1000;
    return new Date(ms);
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function matchesCriteria(val: any, criteria: any): boolean {
  if (criteria === undefined || criteria === null) return val === criteria;
  const cStr = String(criteria).trim();
  const match = /^(<=|>=|<>|=|<|>)(.*)$/.exec(cStr);
  if (match) {
    const op = match[1];
    const target = match[2];
    const numTarget = Number(target);
    const numVal = Number(val);
    if (!isNaN(numTarget) && !isNaN(numVal)) {
      if (op === '=') return numVal === numTarget;
      if (op === '<>') return numVal !== numTarget;
      if (op === '<') return numVal < numTarget;
      if (op === '>') return numVal > numTarget;
      if (op === '<=') return numVal <= numTarget;
      if (op === '>=') return numVal >= numTarget;
    }
    const sVal = String(val ?? '');
    if (op === '=') return sVal.toLowerCase() === target.toLowerCase();
    if (op === '<>') return sVal.toLowerCase() !== target.toLowerCase();
    return false;
  }
  // Wildcards * and ?
  if (cStr.includes('*') || cStr.includes('?')) {
    const regex = new RegExp('^' + cStr.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
    return regex.test(String(val ?? ''));
  }
  return String(val ?? '').toLowerCase() === cStr.toLowerCase();
}

export const standardFunctions: Record<string, FunctionHandler> = {
  // --- Math ---
  SUM: (args) => {
    let sum = 0;
    for (const a of args.flat(Infinity)) {
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
    for (const a of args.flat(Infinity)) {
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
    for (const a of args.flat(Infinity)) {
      if (isExcelError(a)) return a;
      const n = typeof a === 'number' ? a : (typeof a === 'string' && !isNaN(Number(a)) ? Number(a) : null);
      if (n != null) min = min == null ? n : Math.min(min, n);
    }
    return min != null ? min : 0;
  },
  MAX: (args) => {
    let max: number | null = null;
    for (const a of args.flat(Infinity)) {
      if (isExcelError(a)) return a;
      const n = typeof a === 'number' ? a : (typeof a === 'string' && !isNaN(Number(a)) ? Number(a) : null);
      if (n != null) max = max == null ? n : Math.max(max, n);
    }
    return max != null ? max : 0;
  },
  ABS: (args) => {
    const n = toNum(args[0]);
    return isNaN(n) ? makeError('#VALUE!') : Math.abs(n);
  },
  ROUND: (args) => {
    const n = toNum(args[0]);
    const d = args[1] != null ? toNum(args[1]) : 0;
    if (isNaN(n) || isNaN(d)) return makeError('#VALUE!');
    const f = Math.pow(10, d);
    const sign = n < 0 ? -1 : 1;
    return (sign * Math.round(Math.abs(n) * f)) / f;
  },
  ROUNDUP: (args) => {
    const n = toNum(args[0]);
    const d = args[1] != null ? toNum(args[1]) : 0;
    if (isNaN(n) || isNaN(d)) return makeError('#VALUE!');
    const f = Math.pow(10, d);
    return Math.sign(n) * Math.ceil(Math.abs(n) * f) / f;
  },
  ROUNDDOWN: (args) => {
    const n = toNum(args[0]);
    const d = args[1] != null ? toNum(args[1]) : 0;
    if (isNaN(n) || isNaN(d)) return makeError('#VALUE!');
    const f = Math.pow(10, d);
    return Math.sign(n) * Math.floor(Math.abs(n) * f) / f;
  },
  INT: (args) => {
    const n = toNum(args[0]);
    return isNaN(n) ? makeError('#VALUE!') : Math.floor(n);
  },
  MOD: (args) => {
    const a = toNum(args[0]), b = toNum(args[1]);
    if (isNaN(a) || isNaN(b)) return makeError('#VALUE!');
    if (b === 0) return makeError('#DIV/0!');
    return a - b * Math.floor(a / b);
  },
  POWER: (args) => {
    const a = toNum(args[0]), b = toNum(args[1]);
    if (isNaN(a) || isNaN(b)) return makeError('#VALUE!');
    return Math.pow(a, b);
  },
  SQRT: (args) => {
    const n = toNum(args[0]);
    if (isNaN(n)) return makeError('#VALUE!');
    return n < 0 ? makeError('#NUM!') : Math.sqrt(n);
  },
  PRODUCT: (args) => {
    let p = 1;
    for (const a of args.flat(Infinity)) {
      if (typeof a === 'number') p *= a;
    }
    return p;
  },
  SIGN: (args) => {
    const n = toNum(args[0]);
    return isNaN(n) ? makeError('#VALUE!') : Math.sign(n);
  },
  CEILING: (args) => {
    const n = toNum(args[0]);
    const sig = args[1] != null ? toNum(args[1]) : 1;
    if (isNaN(n) || isNaN(sig)) return makeError('#VALUE!');
    if (sig === 0) return 0;
    return Math.ceil(n / sig) * sig;
  },
  FLOOR: (args) => {
    const n = toNum(args[0]);
    const sig = args[1] != null ? toNum(args[1]) : 1;
    if (isNaN(n) || isNaN(sig)) return makeError('#VALUE!');
    if (sig === 0) return 0;
    return Math.floor(n / sig) * sig;
  },
  TRUNC: (args) => {
    const n = toNum(args[0]);
    const d = args[1] != null ? toNum(args[1]) : 0;
    if (isNaN(n) || isNaN(d)) return makeError('#VALUE!');
    const f = Math.pow(10, d);
    return Math.trunc(n * f) / f;
  },
  PI: () => Math.PI,
  RAND: () => Math.random(),
  RANDBETWEEN: (args) => {
    const bottom = Math.ceil(toNum(args[0]));
    const top = Math.floor(toNum(args[1]));
    if (isNaN(bottom) || isNaN(top)) return makeError('#VALUE!');
    if (bottom > top) return makeError('#NUM!');
    return Math.floor(Math.random() * (top - bottom + 1)) + bottom;
  },
  EXP: (args) => {
    const n = toNum(args[0]);
    return isNaN(n) ? makeError('#VALUE!') : Math.exp(n);
  },
  LN: (args) => {
    const n = toNum(args[0]);
    if (isNaN(n)) return makeError('#VALUE!');
    return n <= 0 ? makeError('#NUM!') : Math.log(n);
  },
  LOG10: (args) => {
    const n = toNum(args[0]);
    if (isNaN(n)) return makeError('#VALUE!');
    return n <= 0 ? makeError('#NUM!') : Math.log10(n);
  },
  LOG: (args) => {
    const n = toNum(args[0]);
    const base = args[1] != null ? toNum(args[1]) : 10;
    if (isNaN(n) || isNaN(base)) return makeError('#VALUE!');
    if (n <= 0 || base <= 0 || base === 1) return makeError('#NUM!');
    return Math.log(n) / Math.log(base);
  },

  // --- Statistical ---
  COUNT: (args) => args.flat(Infinity).filter((a) => typeof a === 'number' || (typeof a === 'string' && a.trim() !== '' && !isNaN(Number(a)))).length,
  COUNTA: (args) => args.flat(Infinity).filter((a) => a != null && a !== '').length,
  COUNTBLANK: (args) => args.flat(Infinity).filter((a) => a == null || a === '').length,
  COUNTIF: (args) => {
    const items = (Array.isArray(args[0]) ? args[0].flat(Infinity) : [args[0]]);
    const criteria = args[1];
    return items.filter((x) => matchesCriteria(x, criteria)).length;
  },
  COUNTIFS: (args) => {
    if (args.length < 2 || args.length % 2 !== 0) return makeError('#VALUE!');
    const ranges: any[][] = [];
    const critList: any[] = [];
    for (let i = 0; i < args.length; i += 2) {
      ranges.push(Array.isArray(args[i]) ? (args[i] as any as any[]).flat(Infinity) : [args[i]]);
      critList.push(args[i + 1]);
    }
    const len = ranges[0].length;
    let count = 0;
    for (let i = 0; i < len; i++) {
      let allMatch = true;
      for (let r = 0; r < ranges.length; r++) {
        if (!matchesCriteria(ranges[r][i], critList[r])) {
          allMatch = false;
          break;
        }
      }
      if (allMatch) count++;
    }
    return count;
  },
  SUMIF: (args) => {
    const range = Array.isArray(args[0]) ? (args[0] as any[]).flat(Infinity) : [args[0]];
    const criteria = args[1];
    const sumRange = args[2] != null ? (Array.isArray(args[2]) ? (args[2] as any[]).flat(Infinity) : [args[2]]) : range;
    let sum = 0;
    for (let i = 0; i < range.length; i++) {
      if (matchesCriteria(range[i], criteria)) {
        const val = toNum(sumRange[i]);
        if (!isNaN(val)) sum += val;
      }
    }
    return sum;
  },
  SUMIFS: (args) => {
    if (args.length < 3) return makeError('#VALUE!');
    const sumRange = Array.isArray(args[0]) ? (args[0] as any[]).flat(Infinity) : [args[0]];
    const critRanges: any[][] = [];
    const critList: any[] = [];
    for (let i = 1; i < args.length; i += 2) {
      critRanges.push(Array.isArray(args[i]) ? (args[i] as any as any[]).flat(Infinity) : [args[i]]);
      critList.push(args[i + 1]);
    }
    let sum = 0;
    for (let i = 0; i < sumRange.length; i++) {
      let allMatch = true;
      for (let c = 0; c < critRanges.length; c++) {
        if (!matchesCriteria(critRanges[c][i], critList[c])) {
          allMatch = false;
          break;
        }
      }
      if (allMatch) {
        const val = toNum(sumRange[i]);
        if (!isNaN(val)) sum += val;
      }
    }
    return sum;
  },
  AVERAGEIF: (args) => {
    const range = Array.isArray(args[0]) ? (args[0] as any[]).flat(Infinity) : [args[0]];
    const criteria = args[1];
    const avgRange = args[2] != null ? (Array.isArray(args[2]) ? (args[2] as any[]).flat(Infinity) : [args[2]]) : range;
    let sum = 0, count = 0;
    for (let i = 0; i < range.length; i++) {
      if (matchesCriteria(range[i], criteria)) {
        const val = toNum(avgRange[i]);
        if (!isNaN(val)) {
          sum += val;
          count++;
        }
      }
    }
    return count > 0 ? sum / count : makeError('#DIV/0!');
  },
  MEDIAN: (args) => {
    const nums = args.flat(Infinity).map(toNum).filter((n) => !isNaN(n)).sort((a, b) => a - b);
    if (nums.length === 0) return makeError('#NUM!');
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  },
  LARGE: (args) => {
    const nums = (Array.isArray(args[0]) ? (args[0] as any[]).flat(Infinity) : [args[0]]).map(toNum).filter((n) => !isNaN(n)).sort((a, b) => b - a);
    const k = toNum(args[1]);
    if (isNaN(k) || k < 1 || k > nums.length) return makeError('#NUM!');
    return nums[k - 1];
  },
  SMALL: (args) => {
    const nums = (Array.isArray(args[0]) ? (args[0] as any[]).flat(Infinity) : [args[0]]).map(toNum).filter((n) => !isNaN(n)).sort((a, b) => a - b);
    const k = toNum(args[1]);
    if (isNaN(k) || k < 1 || k > nums.length) return makeError('#NUM!');
    return nums[k - 1];
  },

  // --- Logic ---
  IF: (args) => {
    const cond = args[0];
    if (isExcelError(cond)) return cond;
    let isTrue = false;
    if (typeof cond === 'boolean') {
      isTrue = cond;
    } else if (typeof cond === 'number') {
      isTrue = cond !== 0;
    } else if (cond === null || cond === undefined || cond === '') {
      isTrue = false;
    } else {
      const n = toNum(cond);
      if (!isNaN(n)) isTrue = n !== 0;
      else isTrue = String(cond).trim().toUpperCase() === 'TRUE';
    }
    return isTrue ? args[1] : (args.length > 2 ? args[2] : false);
  },
  IFERROR: (args) => (isExcelError(args[0]) ? args[1] : args[0]),
  IFNA: (args) => (isExcelError(args[0]) && args[0].code === '#N/A' ? args[1] : args[0]),
  AND: (args) => {
    const flat = args.flat(Infinity);
    let count = 0;
    for (const a of flat) {
      if (isExcelError(a)) return a;
      if (a === null || a === undefined) continue;
      if (typeof a === 'boolean') {
        count++;
        if (!a) return false;
      } else if (typeof a === 'number') {
        count++;
        if (a === 0) return false;
      } else if (typeof a === 'string') {
        const upper = a.trim().toUpperCase();
        if (upper === 'TRUE') {
          count++;
        } else if (upper === 'FALSE') {
          count++;
          return false;
        } else {
          continue;
        }
      }
    }
    if (count === 0) return makeError('#VALUE!');
    return true;
  },
  OR: (args) => {
    const flat = args.flat(Infinity);
    let count = 0;
    for (const a of flat) {
      if (isExcelError(a)) return a;
      if (a === null || a === undefined) continue;
      if (typeof a === 'boolean') {
        count++;
        if (a) return true;
      } else if (typeof a === 'number') {
        count++;
        if (a !== 0) return true;
      } else if (typeof a === 'string') {
        const upper = a.trim().toUpperCase();
        if (upper === 'TRUE') {
          count++;
          return true;
        } else if (upper === 'FALSE') {
          count++;
        } else {
          continue;
        }
      }
    }
    if (count === 0) return makeError('#VALUE!');
    return false;
  },
  NOT: (args) => {
    const val = args[0];
    if (isExcelError(val)) return val;
    if (val === null || val === undefined || val === '') return true;
    if (typeof val === 'boolean') return !val;
    const n = toNum(val);
    if (!isNaN(n)) return n === 0;
    const upper = String(val).trim().toUpperCase();
    if (upper === 'TRUE') return false;
    if (upper === 'FALSE') return true;
    return makeError('#VALUE!');
  },
  XOR: (args) => {
    const bools = args.flat(Infinity).filter((x) => typeof x === 'boolean');
    return bools.filter(Boolean).length % 2 === 1;
  },
  SWITCH: (args) => {
    if (args.length < 3) return makeError('#VALUE!');
    const target = args[0];
    for (let i = 1; i < args.length - 1; i += 2) {
      if (args[i] === target) return args[i + 1];
    }
    return args.length % 2 === 0 ? args[args.length - 1] : makeError('#N/A');
  },

  // --- Text ---
  CONCAT: (args) => args.flat(Infinity).map((a) => (a != null ? String(a) : '')).join(''),
  CONCATENATE: (args) => args.flat(Infinity).map((a) => (a != null ? String(a) : '')).join(''),
  LEFT: (args) => {
    const s = String(args[0] ?? '');
    const n = args[1] != null ? toNum(args[1]) : 1;
    return s.slice(0, Math.max(0, n));
  },
  RIGHT: (args) => {
    const s = String(args[0] ?? '');
    const n = args[1] != null ? toNum(args[1]) : 1;
    return n <= 0 ? '' : s.slice(-n);
  },
  MID: (args) => {
    const s = String(args[0] ?? '');
    const start = toNum(args[1]) - 1;
    const len = toNum(args[2]);
    return start < 0 || isNaN(start) || isNaN(len) ? makeError('#VALUE!') : s.substr(start, Math.max(0, len));
  },
  LEN: (args) => String(args[0] ?? '').length,
  TRIM: (args) => String(args[0] ?? '').trim().replace(/\s+/g, ' '),
  UPPER: (args) => String(args[0] ?? '').toUpperCase(),
  LOWER: (args) => String(args[0] ?? '').toLowerCase(),
  PROPER: (args) => String(args[0] ?? '').toLowerCase().replace(/(^|[^a-z0-9])([a-z])/g, (_, a, b) => a + b.toUpperCase()),
  SUBSTITUTE: (args) => {
    const s = String(args[0] ?? ''), target = String(args[1] ?? ''), repl = String(args[2] ?? '');
    return s.split(target).join(repl);
  },
  REPLACE: (args) => {
    const s = String(args[0] ?? '');
    const start = toNum(args[1]) - 1;
    const numChars = toNum(args[2]);
    const newText = String(args[3] ?? '');
    if (isNaN(start) || isNaN(numChars) || start < 0) return makeError('#VALUE!');
    return s.slice(0, start) + newText + s.slice(start + numChars);
  },
  TEXTJOIN: (args) => {
    const delim = String(args[0] ?? '');
    const ignoreEmpty = Boolean(args[1]);
    const items = args.slice(2).flat(Infinity);
    return items.filter((x) => !ignoreEmpty || (x != null && x !== '')).join(delim);
  },
  EXACT: (args) => String(args[0] ?? '') === String(args[1] ?? ''),
  REPT: (args) => String(args[0] ?? '').repeat(Math.max(0, Math.min(10000, toNum(args[1])))),
  FIND: (args) => {
    const findText = String(args[0] ?? '');
    const within = String(args[1] ?? '');
    const start = args[2] != null ? toNum(args[2]) - 1 : 0;
    const idx = within.indexOf(findText, start);
    return idx === -1 ? makeError('#VALUE!') : idx + 1;
  },
  SEARCH: (args) => {
    const findText = String(args[0] ?? '').toLowerCase();
    const within = String(args[1] ?? '').toLowerCase();
    const start = args[2] != null ? toNum(args[2]) - 1 : 0;
    const idx = within.indexOf(findText, start);
    return idx === -1 ? makeError('#VALUE!') : idx + 1;
  },
  CHAR: (args) => {
    const code = toNum(args[0]);
    return isNaN(code) ? makeError('#VALUE!') : String.fromCharCode(code);
  },
  CODE: (args) => {
    const s = String(args[0] ?? '');
    return s.length === 0 ? makeError('#VALUE!') : s.charCodeAt(0);
  },

  // --- Date & Time ---
  DATE: (args) => {
    const y = toNum(args[0]), m = toNum(args[1]) - 1, d = toNum(args[2]);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return makeError('#VALUE!');
    const dt = new Date(Date.UTC(y, m, d));
    return dt.toISOString().split('T')[0];
  },
  YEAR: (args) => {
    const s = String(args[0] ?? '');
    const m = /^(\d{4})/.exec(s);
    if (m) return Number(m[1]);
    const dt = parseDate(args[0]);
    return dt ? dt.getUTCFullYear() : makeError('#VALUE!');
  },
  MONTH: (args) => {
    const s = String(args[0] ?? '');
    const m = /^\d{4}[-/](\d{1,2})/.exec(s);
    if (m) return Number(m[1]);
    const dt = parseDate(args[0]);
    return dt ? dt.getUTCMonth() + 1 : makeError('#VALUE!');
  },
  DAY: (args) => {
    const s = String(args[0] ?? '');
    const m = /^\d{4}[-/]\d{1,2}[-/](\d{1,2})/.exec(s);
    if (m) return Number(m[1]);
    const dt = parseDate(args[0]);
    return dt ? dt.getUTCDate() : makeError('#VALUE!');
  },
  TODAY: () => new Date().toISOString().split('T')[0],
  NOW: () => new Date().toISOString().replace('T', ' ').slice(0, 19),
  EDATE: (args) => {
    const s = String(args[0] ?? '');
    const parts = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
    const months = toNum(args[1]);
    if (!parts || isNaN(months)) return makeError('#VALUE!');
    const dt = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1 + months, Number(parts[3])));
    return dt.toISOString().split('T')[0];
  },
  EOMONTH: (args) => {
    const s = String(args[0] ?? '');
    const parts = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
    const months = toNum(args[1]);
    if (!parts || isNaN(months)) return makeError('#VALUE!');
    const dt = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) + months, 0));
    return dt.toISOString().split('T')[0];
  },
  NETWORKDAYS: (args) => {
    const start = parseDate(args[0]);
    const end = parseDate(args[1]);
    if (!start || !end) return makeError('#VALUE!');
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  },
  WEEKDAY: (args) => {
    const dt = parseDate(args[0]);
    return dt ? dt.getDay() + 1 : makeError('#VALUE!'); // 1 = Sunday ... 7 = Saturday
  },

  // --- Lookup & Reference ---
  VLOOKUP: (args) => {
    const lookup = args[0];
    const table = args[1];
    const colIdx = toNum(args[2]);
    const exact = args[3] !== undefined ? Boolean(args[3]) : true;

    if (!Array.isArray(table) || isNaN(colIdx) || colIdx < 1) return makeError('#VALUE!');
    const rows = Array.isArray(table[0]) ? table : [table];

    for (const row of rows) {
      const key = Array.isArray(row) ? row[0] : row;
      const match = exact
        ? (String(key).toLowerCase() === String(lookup ?? '').toLowerCase())
        : (lookup !== null && key != null && key <= lookup);
      if (match) {
        return Array.isArray(row) ? (row[colIdx - 1] ?? makeError('#REF!')) : row;
      }
    }
    return makeError('#N/A');
  },
  HLOOKUP: (args) => {
    const lookup = args[0];
    const table = args[1];
    const rowIdx = toNum(args[2]);
    if (!Array.isArray(table) || isNaN(rowIdx) || rowIdx < 1) return makeError('#VALUE!');
    const headerRow = table[0];
    if (!Array.isArray(headerRow)) return makeError('#VALUE!');
    for (let c = 0; c < headerRow.length; c++) {
      if (String(headerRow[c]).toLowerCase() === String(lookup).toLowerCase()) {
        return table[rowIdx - 1]?.[c] ?? makeError('#REF!');
      }
    }
    return makeError('#N/A');
  },
  XLOOKUP: (args) => {
    const lookup = args[0];
    const lookupArr = Array.isArray(args[1]) ? (args[1] as any[]).flat(Infinity) : [args[1]];
    const returnArr = Array.isArray(args[2]) ? (args[2] as any[]).flat(Infinity) : [args[2]];
    const ifNotFound = args[3] ?? makeError('#N/A');
    for (let i = 0; i < lookupArr.length; i++) {
      if (String(lookupArr[i]).toLowerCase() === String(lookup).toLowerCase()) {
        return returnArr[i] ?? makeError('#REF!');
      }
    }
    return ifNotFound;
  },
  INDEX: (args) => {
    const arr = args[0];
    const r = toNum(args[1]);
    const c = args[2] != null ? toNum(args[2]) : 1;
    if (!Array.isArray(arr) || isNaN(r)) return makeError('#VALUE!');
    if (Array.isArray(arr[0])) {
      return (arr as any[][])[r - 1]?.[c - 1] ?? makeError('#REF!');
    }
    return (arr as any[])[r - 1] ?? makeError('#REF!');
  },
  MATCH: (args) => {
    const lookup = args[0];
    const arr = Array.isArray(args[1]) ? (args[1] as any[]).flat(Infinity) : [args[1]];
    for (let i = 0; i < arr.length; i++) {
      if (String(arr[i]).toLowerCase() === String(lookup).toLowerCase()) {
        return i + 1; // 1-based index
      }
    }
    return makeError('#N/A');
  },
  CHOOSE: (args) => {
    const idx = toNum(args[0]);
    if (isNaN(idx) || idx < 1 || idx >= args.length) return makeError('#VALUE!');
    return args[idx];
  },

  // --- Financial ---
  PMT: (args) => {
    const rate = toNum(args[0]);
    const nper = toNum(args[1]);
    const pv = toNum(args[2]);
    const fv = args[3] != null ? toNum(args[3]) : 0;
    const type = args[4] != null ? toNum(args[4]) : 0;
    if (isNaN(rate) || isNaN(nper) || isNaN(pv)) return makeError('#VALUE!');
    if (rate === 0) return -(pv + fv) / nper;
    const pvif = Math.pow(1 + rate, nper);
    return - (rate * (fv + (pv * pvif))) / ((pvif - 1) * (1 + rate * type));
  },
  PV: (args) => {
    const rate = toNum(args[0]);
    const nper = toNum(args[1]);
    const pmt = toNum(args[2]);
    const fv = args[3] != null ? toNum(args[3]) : 0;
    const type = args[4] != null ? toNum(args[4]) : 0;
    if (isNaN(rate) || isNaN(nper) || isNaN(pmt)) return makeError('#VALUE!');
    if (rate === 0) return -(pmt * nper + fv);
    const pvif = Math.pow(1 + rate, nper);
    return - (fv + pmt * (1 + rate * type) * (pvif - 1) / rate) / pvif;
  },
  FV: (args) => {
    const rate = toNum(args[0]);
    const nper = toNum(args[1]);
    const pmt = toNum(args[2]);
    const pv = args[3] != null ? toNum(args[3]) : 0;
    const type = args[4] != null ? toNum(args[4]) : 0;
    if (isNaN(rate) || isNaN(nper) || isNaN(pmt)) return makeError('#VALUE!');
    if (rate === 0) return -(pv + pmt * nper);
    const pvif = Math.pow(1 + rate, nper);
    return - (pv * pvif + pmt * (1 + rate * type) * (pvif - 1) / rate);
  },
  NPV: (args) => {
    const rate = toNum(args[0]);
    if (isNaN(rate)) return makeError('#VALUE!');
    const values = args.slice(1).flat(Infinity).map(toNum).filter((n) => !isNaN(n));
    let npv = 0;
    for (let i = 0; i < values.length; i++) {
      npv += values[i] / Math.pow(1 + rate, i + 1);
    }
    return npv;
  },

  // --- Array / Modern ---
  UNIQUE: (args) => {
    const items = args.flat(Infinity);
    const set = new Set();
    const result: any[] = [];
    for (const it of items) {
      if (!set.has(it)) {
        set.add(it);
        result.push(it);
      }
    }
    return result;
  },
  SORT: (args) => {
    let items: any[];
    let order = 1;
    if (Array.isArray(args[0])) {
      items = [...(args[0] as any[]).flat(Infinity)];
      order = args[2] === -1 || args[1] === -1 ? -1 : 1;
    } else {
      const last = args[args.length - 1];
      if (last === -1 || last === 1) {
        order = last;
        items = args.slice(0, args.length - 1).flat(Infinity);
      } else {
        items = args.flat(Infinity);
      }
    }
    items.sort((a: any, b: any) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      if (a < b) return -1 * order;
      if (a > b) return 1 * order;
      return 0;
    });
    return items;
  },
  TRANSPOSE: (args) => {
    const matrix = args[0];
    if (!Array.isArray(matrix)) return matrix;
    if (!Array.isArray(matrix[0])) return matrix.map((x) => [x]);
    const rows = matrix.length;
    const cols = matrix[0].length;
    const res: any[][] = [];
    for (let c = 0; c < cols; c++) {
      res[c] = [];
      for (let r = 0; r < rows; r++) {
        res[c][r] = matrix[r][c];
      }
    }
    return res;
  },
  SEQUENCE: (args) => {
    const rows = Math.max(1, Math.floor(toNum(args[0]) || 1));
    const cols = Math.max(1, Math.floor(toNum(args[1]) || 1));
    let start = toNum(args[2]);
    if (isNaN(start)) start = 1;
    let step = toNum(args[3]);
    if (isNaN(step)) step = 1;

    const res: number[][] = [];
    let cur = start;
    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) {
        row.push(cur);
        cur += step;
      }
      res.push(row);
    }
    return res.length === 1 && cols === 1 ? res[0][0] : res;
  },

  // --- Information ---
  ISBLANK: (args) => args[0] == null || args[0] === '',
  ISNUMBER: (args) => typeof args[0] === 'number',
  ISTEXT: (args) => typeof args[0] === 'string',
  ISERROR: (args) => isExcelError(args[0]),
  ISNA: (args) => isExcelError(args[0]) && args[0].code === '#N/A',
  ISLOGICAL: (args) => typeof args[0] === 'boolean',
  NA: () => makeError('#N/A')
};
