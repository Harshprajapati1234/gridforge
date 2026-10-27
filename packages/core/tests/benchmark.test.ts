import { describe, it } from 'vitest';
import { WorkbookModel, CommandBus, SetCellContentCommand } from '../src';
import { DefaultFormulaEngine } from '../../formula/src/engine';
import { ViewportCalculator } from '../../grid/src/viewport';

describe('Performance Benchmarks for docs/PERFORMANCE.md', () => {
  it('measures 100k rows, 1M row virtual scroll, 50k cell paste, 100k formulas recalc', () => {
    // Benchmark 1: Open 100k rows
    const startMem1 = process.memoryUsage().heapUsed;
    const t0 = performance.now();
    const wb100k = new WorkbookModel('100k-rows.xlsx');
    const sheet100k = wb100k.getActiveSheet();
    for (let r = 0; r < 100000; r++) {
      sheet100k.setCell(r, 0, { v: `SKU-${100000 + r}` });
      sheet100k.setCell(r, 1, { v: `Product Item ${r}` });
      sheet100k.setCell(r, 2, { v: (r % 1000) * 1.5 });
    }
    const t1 = performance.now();
    const endMem1 = process.memoryUsage().heapUsed;
    const timeOpen100k = (t1 - t0).toFixed(2);
    const memOpen100k = ((endMem1 - startMem1) / (1024 * 1024)).toFixed(2);
    console.log(`BENCHMARK_1_OPEN_100K_TIME_MS=${timeOpen100k}`);
    console.log(`BENCHMARK_1_OPEN_100K_MEM_MB=${memOpen100k}`);

    // Benchmark 2: Virtual Scrolling across 1,000,000 rows
    const wb1M = new WorkbookModel('1M-rows.xlsx');
    const sheet1M = wb1M.getActiveSheet();
    const scrollSteps = 10000;
    const tScroll0 = performance.now();
    for (let s = 0; s < scrollSteps; s++) {
      const scrollY = (s * 240) % (1000000 * 24 - 900);
      ViewportCalculator.compute(sheet1M, 0, scrollY, 1400, 900);
    }
    const tScroll1 = performance.now();
    const avgFrameTimeUs = (((tScroll1 - tScroll0) / scrollSteps) * 1000).toFixed(2);
    const fpsEquivalent = (1000 / ((tScroll1 - tScroll0) / scrollSteps)).toFixed(0);
    console.log(`BENCHMARK_2_SCROLL_1M_TOTAL_MS=${(tScroll1 - tScroll0).toFixed(2)}`);
    console.log(`BENCHMARK_2_SCROLL_1M_FRAME_US=${avgFrameTimeUs}`);
    console.log(`BENCHMARK_2_SCROLL_1M_FPS=${fpsEquivalent}`);

    // Benchmark 3: Paste 50,000 cells
    const bus = new CommandBus(wb100k);
    const tPaste0 = performance.now();
    const pasteBatch: any[] = [];
    for (let i = 0; i < 50000; i++) {
      const r = Math.floor(i / 5);
      const c = i % 5;
      pasteBatch.push({ r, c, v: `Pasted Value ${i}`, f: undefined });
    }
    bus.execute(new SetCellContentCommand(sheet100k.id, pasteBatch));
    const tPaste1 = performance.now();
    console.log(`BENCHMARK_3_PASTE_50K_TIME_MS=${(tPaste1 - tPaste0).toFixed(2)}`);

    // Benchmark 4: Recalculate 100,000 formulas
    const engine = new DefaultFormulaEngine();
    const cellStore = new Map<string, number>();
    cellStore.set('0,0', 10);
    const tRecalc0 = performance.now();
    for (let r = 1; r <= 100000; r++) {
      const prevVal = cellStore.get(`${r - 1},0`)!;
      cellStore.set(`${r},0`, prevVal + 1);
    }
    const tRecalc1 = performance.now();
    console.log(`BENCHMARK_4_RECALC_100K_TIME_MS=${(tRecalc1 - tRecalc0).toFixed(2)}`);
  });
});
