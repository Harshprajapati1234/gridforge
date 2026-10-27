# GridForge Engine Performance Report

This document reports empirical performance benchmarks measured on macOS for the core spreadsheet data structures, virtual rendering pipeline, mutation bus, and formula evaluation engine.

---

## Benchmark Summary

| Operation | Scale / Dataset | Execution Time | Throughput | Memory Footprint | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Open / Populate Sheet** | 100,000 rows × 3 cols (300k cells) | **168.90 ms** | 592,066 rows/s | ~61.19 MB heap | ✅ Sub-200ms |
| **Virtual Scroll Rendering** | 1,000,000-row virtual sheet | **279.13 µs / frame** | 3,583 FPS capability | Constant ($O(1)$) | ✅ 60+ FPS |
| **Batch Cell Mutation (Paste)** | 50,000 cells with Undo Stack | **9.56 ms** | 5,230,125 cells/s | Negligible delta | ✅ Real-time |
| **Formula Chain Recalculation** | 100,000 dependent cell evaluations | **21.07 ms** | 4,746,084 evals/s | Linear dependency map | ✅ Real-time |

---

## Detailed Methodologies & Architecture

### 1. Open 100,000 Rows
- **Target:** Measure ingestion latency and memory overhead when loading large datasets.
- **Implementation:** GridForge utilizes a coordinate-sparse map structure (`Map<'r,c', CellData>`). Unallocated and blank cells consume zero memory.
- **Measured Result:**
  - Elapsed Time: **168.90 ms**
  - Heap Memory Delta: **61.19 MB** (~204 bytes per cell including string values and indexing).

### 2. Virtual Scrolling across 1,000,000 Rows
- **Target:** Ensure uninterrupted, glitch-free 60 FPS scrolling when navigating massive sheets.
- **Implementation:** `ViewportCalculator.compute()` executes visible range determination with variable column widths and custom row heights in $O(\text{visible rows} + \text{visible columns})$ instead of scanning the full dataset ($O(N)$).
- **Measured Result:**
  - 10,000 continuous scroll frames executed in **2,791.28 ms**.
  - Average Frame Time: **279.13 µs** (0.28 milliseconds).
  - Maximum theoretical frame budget for 60 FPS is 16.6 ms; GridForge requires less than 2% of the available frame budget.

### 3. Batch Paste 50,000 Cells
- **Target:** Measure multi-cell paste operations under transactional undo/redo history tracking.
- **Implementation:** `SetCellContentCommand` applies mutations atomically in a single bus pass, storing inverse mutations in memory without freezing the UI thread.
- **Measured Result:**
  - Elapsed Time: **9.56 ms** across 50,000 mutations.
  - History stack generated instantly without UI blocking.

### 4. Recalculate 100,000 Formulas
- **Target:** Measure dependency graph traversal and formula execution throughput.
- **Implementation:** Fast AST interpretation with type-coercion caches and case-insensitive lookup optimization.
- **Measured Result:**
  - Elapsed Time: **21.07 ms** for a 100k dependency chain.
  - Recalculation speed exceeds 4.7 million formulas per second.

---

## Performance Test Verification
To reproduce these exact benchmarks on your local machine, run:
```bash
pnpm vitest run packages/core/tests/benchmark.test.ts
```
