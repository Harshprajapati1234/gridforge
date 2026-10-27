export type AggregationType = 'sum' | 'count' | 'average' | 'min' | 'max';

export interface PivotConfig {
  sourceRange: { startRow: number; startCol: number; endRow: number; endCol: number };
  rowFields: number[]; // column indices to group rows by
  colFields: number[]; // column indices to group cols by
  valueField: number;  // column index for values
  aggregation: AggregationType;
}

export interface PivotResult {
  headers: string[];
  rowHeaders: string[];
  matrix: (number | string)[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
}

export class PivotEngine {
  public static compute(sheetCells: (r: number, c: number) => any, config: PivotConfig): PivotResult {
    const { sourceRange, rowFields, colFields, valueField, aggregation } = config;

    // 1. Read headers
    const headerRow = sourceRange.startRow;

    // 2. Read records
    const records: Record<string, any>[] = [];
    for (let r = sourceRange.startRow + 1; r <= sourceRange.endRow; r++) {
      const rec: Record<string, any> = {};
      for (let c = sourceRange.startCol; c <= sourceRange.endCol; c++) {
        const cell = sheetCells(r, c);
        rec[c] = cell?.v ?? null;
      }
      records.push(rec);
    }

    // 3. Extract unique row groupings & col groupings
    const rowKeySet = new Set<string>();
    const colKeySet = new Set<string>();

    for (const rec of records) {
      const rKey = rowFields.map((f) => String(rec[f] ?? '(blank)')).join(' | ') || 'All';
      const cKey = colFields.map((f) => String(rec[f] ?? '(blank)')).join(' | ') || 'Total';
      rowKeySet.add(rKey);
      colKeySet.add(cKey);
    }

    const rowKeys = Array.from(rowKeySet).sort();
    const colKeys = Array.from(colKeySet).sort();

    // 4. Bucket values
    const buckets: Map<string, number[]> = new Map();
    for (const rec of records) {
      const rKey = rowFields.map((f) => String(rec[f] ?? '(blank)')).join(' | ') || 'All';
      const cKey = colFields.map((f) => String(rec[f] ?? '(blank)')).join(' | ') || 'Total';
      const bucketKey = `${rKey}:::${cKey}`;
      const val = Number(rec[valueField]);

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      if (!isNaN(val)) {
        buckets.get(bucketKey)!.push(val);
      }
    }

    const calcAgg = (nums: number[]): number => {
      if (!nums || nums.length === 0) return 0;
      switch (aggregation) {
        case 'sum':
          return nums.reduce((a, b) => a + b, 0);
        case 'count':
          return nums.length;
        case 'average':
          return nums.reduce((a, b) => a + b, 0) / nums.length;
        case 'min':
          return Math.min(...nums);
        case 'max':
          return Math.max(...nums);
      }
    };

    // 5. Build matrix
    const matrix: (number | string)[][] = [];
    const rowTotals: number[] = [];
    const colTotals: number[] = new Array(colKeys.length).fill(0);
    const colAllNums: number[][] = Array.from({ length: colKeys.length }, () => []);
    const allNums: number[] = [];

    for (let r = 0; r < rowKeys.length; r++) {
      const rKey = rowKeys[r];
      const rowVals: (number | string)[] = [];
      const rowNums: number[] = [];

      for (let c = 0; c < colKeys.length; c++) {
        const cKey = colKeys[c];
        const nums = buckets.get(`${rKey}:::${cKey}`) || [];
        const aggVal = calcAgg(nums);
        rowVals.push(nums.length > 0 ? Math.round(aggVal * 100) / 100 : '-');
        rowNums.push(...nums);
        colAllNums[c].push(...nums);
        allNums.push(...nums);
      }

      matrix.push(rowVals);
      rowTotals.push(Math.round(calcAgg(rowNums) * 100) / 100);
    }

    for (let c = 0; c < colKeys.length; c++) {
      colTotals[c] = Math.round(calcAgg(colAllNums[c]) * 100) / 100;
    }

    const grandTotal = Math.round(calcAgg(allNums) * 100) / 100;

    return {
      headers: colKeys,
      rowHeaders: rowKeys,
      matrix,
      rowTotals,
      colTotals,
      grandTotal
    };
  }
}
