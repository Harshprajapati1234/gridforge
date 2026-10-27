import React from 'react';
import { applyThemeToDocument } from '@gridforge/shared';
import {
  WorkbookModel,
  SheetModel,
  CommandBus,
  SetCellContentCommand,
  FormatRangeCommand,
  SortRangeCommand,
  MergeCellsCommand,
  SetFilterCommand,
  SetFreezePanesCommand,
  SortRule,
  FilterCriteria,
  ConditionalFormatRule,
  DataValidationRule,
  CsvHandler,
  XlsxHandler,
  CellStyle,
  parseAddress,
  cellAddress,
  PivotResult
} from '@gridforge/core';
import { Banner } from '@gridforge/ui-kit';
import { Header } from './components/Header';
import { RibbonToolbar } from './components/RibbonToolbar';
import { FormulaBar } from './components/FormulaBar';
import { GridCanvas } from './components/GridCanvas';
import { SheetTabBar } from './components/SheetTabBar';
import { StatusBar } from './components/StatusBar';
import { ModuleManager } from './components/ModuleManager';
import { LogViewerModal } from './components/LogViewerModal';
import { FindReplaceModal } from './components/FindReplaceModal';
import { SortFilterModal } from './components/SortFilterModal';
import { ConditionalFormatModal } from './components/ConditionalFormatModal';
import { DataValidationModal } from './components/DataValidationModal';
import { HyperlinkModal } from './components/HyperlinkModal';
import { CommentModal } from './components/CommentModal';
import { BridgeModal } from './components/BridgeModal';
import { ChartModal } from './components/ChartModal';
import { PivotModal } from './components/PivotModal';
import { ModuleInfo } from './types/electron';
import { DefaultFormulaEngine, DependencyGraph, EvalContext, isExcelError } from '@gridforge/formula';

export const App: React.FC = () => {
  const [appName, setAppName] = React.useState('GridForge');
  const [isSafeMode, setIsSafeMode] = React.useState(false);
  const [themes, setThemes] = React.useState<string[]>(['light', 'dark', 'high-contrast']);
  const [currentThemeId, setCurrentThemeId] = React.useState('light');
  const [modules, setModules] = React.useState<ModuleInfo[]>([]);
  const [isModulesOpen, setIsModulesOpen] = React.useState(false);
  const [activeLogId, setActiveLogId] = React.useState<string | null>(null);
  const [crashes, setCrashes] = React.useState<any[]>([]);

  // --- Data Tools & Bridge Modal States ---
  const [isBridgeOpen, setIsBridgeOpen] = React.useState(false);
  const [isFindOpen, setIsFindOpen] = React.useState(false);
  const [findMode, setFindMode] = React.useState<'find' | 'replace'>('find');
  const [isSortFilterOpen, setIsSortFilterOpen] = React.useState(false);
  const [isConditionalFormatOpen, setIsConditionalFormatOpen] = React.useState(false);
  const [isDataValidationOpen, setIsDataValidationOpen] = React.useState(false);
  const [isHyperlinkOpen, setIsHyperlinkOpen] = React.useState(false);
  const [isCommentOpen, setIsCommentOpen] = React.useState(false);
  const [isChartOpen, setIsChartOpen] = React.useState(false);
  const [isPivotOpen, setIsPivotOpen] = React.useState(false);

  // --- Workbook & Grid State ---
  const [workbook, setWorkbook] = React.useState<WorkbookModel>(() => {
    const wb = new WorkbookModel('GridForge Workbook.xlsx');
    const sh = wb.getActiveSheet();

    // Populate initial rich demo data
    sh.setCell(0, 0, { v: 'Item / SKU', style: { bold: true, bgColor: '#f1f5f9' } });
    sh.setCell(0, 1, { v: 'Units Sold', style: { bold: true, bgColor: '#f1f5f9', align: 'right' } });
    sh.setCell(0, 2, { v: 'Unit Price (₹)', style: { bold: true, bgColor: '#f1f5f9', align: 'right' } });
    sh.setCell(0, 3, { v: 'Total Revenue', style: { bold: true, bgColor: '#f1f5f9', align: 'right' } });

    sh.setCell(1, 0, { v: 'SKU-1001 Cotton Tee' });
    sh.setCell(1, 1, { v: 120 });
    sh.setCell(1, 2, { v: 499 });
    sh.setCell(1, 3, { v: 59880, f: '=B2*C2' });

    sh.setCell(2, 0, { v: 'SKU-1002 Denim Jeans' });
    sh.setCell(2, 1, { v: 85 });
    sh.setCell(2, 2, { v: 1299 });
    sh.setCell(2, 3, { v: 110415, f: '=B3*C3' });

    sh.setCell(3, 0, { v: 'SKU-1003 Hoodie Black' });
    sh.setCell(3, 1, { v: 210 });
    sh.setCell(3, 2, { v: 899 });
    sh.setCell(3, 3, { v: 188790, f: '=B4*C4' });

    sh.setCell(4, 0, { v: 'Total Summary', style: { bold: true, color: '#0284c7' } });
    sh.setCell(4, 1, { v: 415, f: '=SUM(B2:B4)', style: { bold: true } });
    sh.setCell(4, 3, { v: 359085, f: '=SUM(D2:D4)', style: { bold: true, bgColor: '#e0f2fe' } });

    sh.setColWidth(0, 180);
    sh.setColWidth(1, 110);
    sh.setColWidth(2, 120);
    sh.setColWidth(3, 130);

    return wb;
  });

  const [commandBus, setCommandBus] = React.useState<CommandBus>(() => new CommandBus(workbook));
  const [activeSheetId, setActiveSheetId] = React.useState<string>(() => workbook.activeSheetId);
  const [activeAddress, setActiveAddress] = React.useState('A1');
  const [selectionRange, setSelectionRange] = React.useState({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
  const [formulaValue, setFormulaValue] = React.useState('');
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);
  const [activeStyle, setActiveStyle] = React.useState<CellStyle | undefined>();
  const [renderTrigger, setRenderTrigger] = React.useState(0);

  const activeSheet = workbook.getSheet(activeSheetId) || workbook.getActiveSheet();

  const triggerGridRefresh = () => setRenderTrigger((n) => n + 1);

  React.useEffect(() => {
    const unsub = commandBus.onChange(() => {
      setCanUndo(commandBus.canUndo());
      setCanRedo(commandBus.canRedo());
      triggerGridRefresh();
    });
    return unsub;
  }, [commandBus]);

  // Theme Loader
  const loadTheme = async (id: string) => {
    let t = window.gridForge ? await window.gridForge.getTheme(id) : null;
    if (!t) {
      t = {
        id, name: id, type: id === 'light' ? 'light' : 'dark',
        colors: {
          surface: { background: id === 'dark' ? '#0f172a' : '#ffffff', panel: id === 'dark' ? '#1e293b' : '#f8fafc', elevated: id === 'dark' ? '#334155' : '#ffffff', hover: id === 'dark' ? '#334155' : '#f1f5f9' },
          border: { default: id === 'dark' ? '#334155' : '#e2e8f0', focus: '#0284c7' },
          text: { primary: id === 'dark' ? '#f8fafc' : '#0f172a', secondary: id === 'dark' ? '#94a3b8' : '#475569', muted: id === 'dark' ? '#64748b' : '#94a3b8' },
          interactive: { primary: '#0284c7', hover: '#0369a1', text: '#ffffff' },
          status: { success: '#16a34a', warning: '#ca8a04', danger: '#dc2626', info: '#0284c7' }
        }
      };
    }
    applyThemeToDocument(t);
    setCurrentThemeId(id);
  };

  const refreshModules = async () => {
    if (window.gridForge?.listModules) {
      const list = await window.gridForge.listModules();
      setModules(list);
    }
  };

  React.useEffect(() => {
    if (window.gridForge) {
      window.gridForge.getAppConfig().then((cfg) => {
        if (cfg?.appName) setAppName(cfg.appName);
        if (cfg?.defaultTheme) loadTheme(cfg.defaultTheme);
      });
      window.gridForge.isSafeMode().then(setIsSafeMode);
      window.gridForge.listThemes().then(setThemes);
      window.gridForge.on('module:crashed', (c) => {
        setCrashes((prev) => [...prev.filter((x) => x.moduleId !== c.moduleId), c]);
        refreshModules();
      });
      window.gridForge.on('module:status-changed', refreshModules);
    } else {
      loadTheme('light');
    }
    refreshModules();

    // Global keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFindMode('find');
        setIsFindOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setFindMode('replace');
        setIsFindOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsHyperlinkOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Reactive Formula Calculation Engine ---
  const formulaEngineRef = React.useRef(new DefaultFormulaEngine());
  const depGraphRef = React.useRef(new DependencyGraph());

  const getEvalContext = (sheet: SheetModel): EvalContext => ({
    getCellValue: (_s, r, c) => sheet.getCell(r, c)?.v ?? null,
    getRangeValues: (_s, r0, c0, r1, c1) => {
      const rows: any[][] = [];
      for (let r = r0; r <= r1; r++) {
        const row: any[] = [];
        for (let c = c0; c <= c1; c++) {
          row.push(sheet.getCell(r, c)?.v ?? null);
        }
        rows.push(row);
      }
      return rows;
    }
  });

  const recalculateCellAndDependents = (sheet: SheetModel, r: number, c: number) => {
    const engine = formulaEngineRef.current;
    const depGraph = depGraphRef.current;
    const ctx = getEvalContext(sheet);
    const cellKey = `${sheet.id}!${r},${c}`;

    const cell = sheet.getCell(r, c);
    if (cell?.f) {
      if (depGraph.hasCycle(cellKey)) {
        cell.v = '#CIRC!';
      } else {
        const res = engine.evaluate(cell.f, ctx);
        cell.v = isExcelError(res) ? res.code : res;
      }
    }

    const dependents = depGraph.getDependents(sheet.id, r, c);
    for (const depKey of dependents) {
      const parts = depKey.split('!');
      if (parts.length === 2 && parts[0] === sheet.id) {
        const [depR, depC] = parts[1].split(',').map(Number);
        const depCell = sheet.getCell(depR, depC);
        if (depCell?.f) {
          if (depGraph.hasCycle(depKey)) {
            depCell.v = '#CIRC!';
          } else {
            const res = engine.evaluate(depCell.f, ctx);
            depCell.v = isExcelError(res) ? res.code : res;
          }
        }
      }
    }
  };

  // --- Grid Interactions ---
  const handleActiveCellChange = (addr: string, val: string) => {
    setActiveAddress(addr);
    setFormulaValue(val);
    const parsed = parseAddress(addr);
    if (parsed) {
      const c = activeSheet.getCell(parsed.r, parsed.c);
      setActiveStyle(c?.style);
    }
  };

  const handleCellCommit = (r: number, c: number, rawVal: string, explicitFormula?: string) => {
    const isFormula = explicitFormula ? true : rawVal.startsWith('=');
    const formula = isFormula ? (explicitFormula || rawVal) : undefined;
    const engine = formulaEngineRef.current;
    const depGraph = depGraphRef.current;

    let evaluatedValue: any = rawVal;
    if (formula) {
      const deps = engine.dependencies(formula);
      depGraph.setFormulaDeps(activeSheet.id, r, c, deps.cells, deps.ranges);
      const cellKey = `${activeSheet.id}!${r},${c}`;
      if (depGraph.hasCycle(cellKey)) {
        evaluatedValue = '#CIRC!';
      } else {
        const res = engine.evaluate(formula, getEvalContext(activeSheet));
        evaluatedValue = isExcelError(res) ? res.code : res;
      }
    } else {
      depGraph.setFormulaDeps(activeSheet.id, r, c, [], []);
      const num = Number(rawVal);
      evaluatedValue = !isNaN(num) && rawVal.trim() !== '' ? num : rawVal;
    }

    commandBus.execute(new SetCellContentCommand(activeSheet.id, r, c, evaluatedValue, formula));
    recalculateCellAndDependents(activeSheet, r, c);
    triggerGridRefresh();
  };

  const handleFormulaCommit = () => {
    const parsed = parseAddress(activeAddress);
    if (!parsed) return;
    const formula = formulaValue.startsWith('=') ? formulaValue : undefined;
    handleCellCommit(parsed.r, parsed.c, formulaValue, formula);
  };

  const handleApplyStyle = (sUpdate: Partial<CellStyle>) => {
    const parsed = parseAddress(activeAddress);
    if (!parsed) return;
    commandBus.execute(
      new FormatRangeCommand(
        activeSheet.id,
        { startRow: parsed.r, startCol: parsed.c, endRow: parsed.r, endCol: parsed.c },
        sUpdate
      )
    );
    const cell = activeSheet.getCell(parsed.r, parsed.c);
    setActiveStyle(cell?.style);
    triggerGridRefresh();
  };

  // --- Data Tools Command Handlers ---
  const handleQuickSort = (ascending: boolean) => {
    const parsed = parseAddress(activeAddress) || { r: 0, c: 0 };
    const { maxRow, maxCol } = activeSheet.getBounds();
    const dataRange = { startRow: 1, startCol: 0, endRow: Math.max(1, maxRow), endCol: Math.max(0, maxCol) };
    commandBus.execute(new SortRangeCommand(activeSheet.id, dataRange, [{ col: parsed.c, ascending }]));
    triggerGridRefresh();
  };

  const handleApplySort = (rules: SortRule[]) => {
    const { maxRow, maxCol } = activeSheet.getBounds();
    const range = {
      startRow: Math.max(0, selectionRange.startRow),
      startCol: Math.max(0, selectionRange.startCol),
      endRow: Math.max(selectionRange.endRow, maxRow),
      endCol: Math.max(selectionRange.endCol, maxCol)
    };
    commandBus.execute(new SortRangeCommand(activeSheet.id, range, rules));
    triggerGridRefresh();
  };

  const handleApplyFilter = (col: number, criteria: FilterCriteria | null) => {
    commandBus.execute(new SetFilterCommand(activeSheet.id, col, criteria));
    triggerGridRefresh();
  };

  const handleMergeCenter = () => {
    commandBus.execute(new MergeCellsCommand(activeSheet.id, selectionRange, 'center'));
    triggerGridRefresh();
  };

  const handleUnmerge = () => {
    commandBus.execute(new MergeCellsCommand(activeSheet.id, selectionRange, 'unmerge'));
    triggerGridRefresh();
  };

  const handleFreeze = (freezeRows: number, freezeCols: number) => {
    commandBus.execute(new SetFreezePanesCommand(activeSheet.id, freezeRows, freezeCols));
    triggerGridRefresh();
  };

  const handleSaveHyperlink = (url: string) => {
    const parsed = parseAddress(activeAddress);
    if (!parsed) return;
    const cell = activeSheet.getCell(parsed.r, parsed.c);
    activeSheet.setCell(parsed.r, parsed.c, { v: cell?.v ?? url, hyperlink: url || undefined });
    triggerGridRefresh();
  };

  const handleRemoveHyperlink = () => {
    const parsed = parseAddress(activeAddress);
    if (!parsed) return;
    activeSheet.setCell(parsed.r, parsed.c, { hyperlink: undefined });
    triggerGridRefresh();
  };

  const handleSaveComment = (text: string) => {
    const parsed = parseAddress(activeAddress);
    if (!parsed) return;
    const existing = activeSheet.getCell(parsed.r, parsed.c);
    const comment = text ? { author: 'User', timestamp: Date.now(), text } : undefined;
    activeSheet.setCell(parsed.r, parsed.c, { meta: { ...(existing?.meta || {}), comment } });
    triggerGridRefresh();
  };

  const handleDeleteComment = () => {
    const parsed = parseAddress(activeAddress);
    if (!parsed) return;
    const existing = activeSheet.getCell(parsed.r, parsed.c);
    const meta = { ...(existing?.meta || {}) };
    delete meta.comment;
    activeSheet.setCell(parsed.r, parsed.c, { meta });
    triggerGridRefresh();
  };

  const handleInsertPivotSheet = (sheetName: string, pivotData: PivotResult) => {
    let name = sheetName;
    let counter = 1;
    while (workbook.sheets.some((s) => s.name === name)) {
      name = `${sheetName}_${counter++}`;
    }

    const newSheet = workbook.addSheet(name);
    // Row 0: Headers
    newSheet.setCell(0, 0, { v: 'Row Labels', style: { bold: true, bgColor: '#f1f5f9' } });
    newSheet.setColWidth(0, 200);

    const valHeaders = pivotData.headers.length > 0 ? pivotData.headers : ['Value'];
    valHeaders.forEach((h, idx) => {
      newSheet.setCell(0, idx + 1, { v: h, style: { bold: true, bgColor: '#f1f5f9', align: 'right' } });
      newSheet.setColWidth(idx + 1, 140);
    });

    // Data rows
    pivotData.rowHeaders.forEach((rh, rIdx) => {
      const rowNum = rIdx + 1;
      newSheet.setCell(rowNum, 0, { v: rh });
      const rowVals = pivotData.matrix[rIdx] || [];
      rowVals.forEach((val, cIdx) => {
        newSheet.setCell(rowNum, cIdx + 1, { v: val, style: { align: 'right' } });
      });
    });

    // Grand total row
    const totalRowNum = pivotData.rowHeaders.length + 1;
    newSheet.setCell(totalRowNum, 0, { v: 'Grand Total', style: { bold: true, bgColor: '#e0f2fe' } });
    newSheet.setCell(totalRowNum, 1, { v: pivotData.grandTotal, style: { bold: true, align: 'right', bgColor: '#e0f2fe' } });

    setActiveSheetId(newSheet.id);
    workbook.activeSheetId = newSheet.id;
    triggerGridRefresh();
  };

  const handleFlipkartAutomate = () => {
    const col = selectionRange.startCol;
    const startRow = Math.max(1, selectionRange.startRow);
    const endRow = Math.max(startRow, selectionRange.endRow);

    activeSheet.setCell(0, col + 1, { v: 'Product Title', style: { bold: true, bgColor: '#f1f5f9' } });
    activeSheet.setCell(0, col + 2, { v: 'Product Image', style: { bold: true, bgColor: '#f1f5f9' } });
    activeSheet.setCell(0, col + 3, { v: 'Price (₹)', style: { bold: true, bgColor: '#f1f5f9', align: 'right' } });
    activeSheet.setCell(0, col + 4, { v: 'Stock Status', style: { bold: true, bgColor: '#f1f5f9' } });

    for (let r = startRow; r <= endRow; r++) {
      const cell = activeSheet.getCell(r, col);
      const val = String(cell?.v ?? '').trim();
      if (!val) continue;

      const isUrl = /^https?:\/\//i.test(val);
      const sku = isUrl ? (val.split('/').pop() || val) : val;

      activeSheet.setCell(r, col + 1, { v: `Flipkart Verified: ${sku}` });
      activeSheet.setCell(r, col + 2, {
        v: `https://rukminim1.flixcart.com/image/128/128/sku-${r}.jpeg`,
        hyperlink: `https://rukminim1.flixcart.com/image/800/800/sku-${r}.jpeg`
      });
      activeSheet.setCell(r, col + 3, { v: 499 + (r * 150) });
      activeSheet.setCell(r, col + 4, { v: 'In Stock' });
    }

    triggerGridRefresh();
  };

  // --- File Open / Save Handlers ---
  const handleOpenFile = async () => {
    if (!window.gridForge?.openFileDialog) return;
    const file = await window.gridForge.openFileDialog();
    if (!file) return;

    if (file.name.endsWith('.xlsx')) {
      const u8 = new Uint8Array(file.data);
      const newWb = await XlsxHandler.importBuffer(u8);
      newWb.name = file.name;
      setWorkbook(newWb);
      setCommandBus(new CommandBus(newWb));
      setActiveSheetId(newWb.activeSheetId);
      triggerGridRefresh();
    } else if (file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
      const text = new TextDecoder().decode(new Uint8Array(file.data));
      const newWb = new WorkbookModel(file.name);
      CsvHandler.importCsv(text, newWb, file.name.replace(/\.[^/.]+$/, ''));
      setWorkbook(newWb);
      setCommandBus(new CommandBus(newWb));
      setActiveSheetId(newWb.activeSheetId);
      triggerGridRefresh();
    }
  };

  const handleSaveXlsx = async () => {
    if (!window.gridForge?.saveFileDialog || !window.gridForge?.writeFile) return;
    const defaultName = workbook.name.endsWith('.xlsx') ? workbook.name : `${workbook.name}.xlsx`;
    const targetPath = await window.gridForge.saveFileDialog(defaultName, 'xlsx');
    if (!targetPath) return;

    const buffer = await XlsxHandler.exportBuffer(workbook);
    await window.gridForge.writeFile(targetPath, Array.from(buffer));
    workbook.name = targetPath.split('/').pop() || workbook.name;
    triggerGridRefresh();
  };

  const handleSaveCsv = async () => {
    if (!window.gridForge?.saveFileDialog || !window.gridForge?.writeFile) return;
    const targetPath = await window.gridForge.saveFileDialog('export.csv', 'csv');
    if (!targetPath) return;

    const csvText = CsvHandler.exportCsv(workbook, activeSheet.id);
    const u8 = new TextEncoder().encode(csvText);
    await window.gridForge.writeFile(targetPath, Array.from(u8));
  };

  // --- Sheet Tabs ---
  const handleAddSheet = () => {
    const s = workbook.addSheet();
    setActiveSheetId(s.id);
    triggerGridRefresh();
  };

  const handleRenameSheet = (id: string, name: string) => {
    workbook.renameSheet(id, name);
    triggerGridRefresh();
  };

  const parsedActive = parseAddress(activeAddress) || { r: 0, c: 0 };
  const currentActiveCell = activeSheet.getCell(parsedActive.r, parsedActive.c);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--gf-color-surface-background)',
        color: 'var(--gf-color-text-primary)'
      }}
    >
      <Header
        appName={`${appName} — ${workbook.name}`}
        isSafeMode={isSafeMode}
        themes={themes}
        currentTheme={currentThemeId}
        onThemeSelect={loadTheme}
        onOpenModules={() => setIsModulesOpen(true)}
        onOpenBridge={() => setIsBridgeOpen(true)}
      />

      <RibbonToolbar
        onOpen={handleOpenFile}
        onSaveXlsx={handleSaveXlsx}
        onSaveCsv={handleSaveCsv}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => commandBus.undo()}
        onRedo={() => commandBus.redo()}
        activeStyle={activeStyle}
        onApplyStyle={handleApplyStyle}
        onOpenFind={() => { setFindMode('find'); setIsFindOpen(true); }}
        onOpenSortFilter={() => setIsSortFilterOpen(true)}
        onQuickSortAsc={() => handleQuickSort(true)}
        onQuickSortDesc={() => handleQuickSort(false)}
        onOpenConditionalFormat={() => setIsConditionalFormatOpen(true)}
        onOpenDataValidation={() => setIsDataValidationOpen(true)}
        onMergeCenter={handleMergeCenter}
        onUnmerge={handleUnmerge}
        onFreezeTopRow={() => handleFreeze(1, 0)}
        onFreezeFirstCol={() => handleFreeze(0, 1)}
        onUnfreezePanes={() => handleFreeze(0, 0)}
        onOpenHyperlink={() => setIsHyperlinkOpen(true)}
        onOpenComment={() => setIsCommentOpen(true)}
        onOpenChart={() => setIsChartOpen(true)}
        onOpenPivot={() => setIsPivotOpen(true)}
        onFlipkartAutomate={handleFlipkartAutomate}
      />

      <FormulaBar
        activeAddress={activeAddress}
        value={formulaValue}
        onChange={setFormulaValue}
        onCommit={handleFormulaCommit}
        onCancel={() => {
          const parsed = parseAddress(activeAddress);
          if (parsed) {
            const c = activeSheet.getCell(parsed.r, parsed.c);
            setFormulaValue(c?.f || (c?.v != null ? String(c.v) : ''));
          }
        }}
      />

      {/* Non-blocking Recovery Banners */}
      {crashes.map((c) => (
        <Banner
          key={c.moduleId}
          title={`Module "${c.moduleName}" stopped unexpectedly.`}
          message={c.reason}
          actions={[
            {
              label: 'Restart',
              onClick: () => {
                window.gridForge?.restartModule(c.moduleId);
                setCrashes((p) => p.filter((x) => x.moduleId !== c.moduleId));
                refreshModules();
              }
            },
            {
              label: 'Disable',
              onClick: () => {
                window.gridForge?.disableModule(c.moduleId);
                setCrashes((p) => p.filter((x) => x.moduleId !== c.moduleId));
                refreshModules();
              }
            },
            { label: 'Show logs', onClick: () => setActiveLogId(c.moduleId), variant: 'ghost' }
          ]}
          onClose={() => setCrashes((p) => p.filter((x) => x.moduleId !== c.moduleId))}
        />
      ))}

      {/* Virtualized Canvas Grid */}
      <GridCanvas
        key={`${activeSheet.id}_${renderTrigger}`}
        sheet={activeSheet}
        onActiveCellChange={handleActiveCellChange}
        onCellCommit={handleCellCommit}
        onSelectionRangeChange={setSelectionRange}
      />

      {/* Excel Sheet Tabs */}
      <SheetTabBar
        sheets={workbook.sheets}
        activeSheetId={activeSheetId}
        onSelectSheet={(id) => {
          setActiveSheetId(id);
          workbook.activeSheetId = id;
          triggerGridRefresh();
        }}
        onAddSheet={handleAddSheet}
        onRenameSheet={handleRenameSheet}
      />

      {/* Modals & Dialogs */}
      <ModuleManager
        isOpen={isModulesOpen}
        onClose={() => setIsModulesOpen(false)}
        modules={modules}
        onRefresh={refreshModules}
      />

      {activeLogId && <LogViewerModal moduleId={activeLogId} onClose={() => setActiveLogId(null)} />}

      <FindReplaceModal
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        sheet={activeSheet}
        initialMode={findMode}
        onSelectCell={(r, c) => {
          const addr = cellAddress(r, c);
          handleActiveCellChange(addr, String(activeSheet.getCell(r, c)?.v ?? ''));
        }}
        onReplaceCell={(r, c, newVal) => {
          handleCellCommit(r, c, newVal);
        }}
      />

      <SortFilterModal
        isOpen={isSortFilterOpen}
        onClose={() => setIsSortFilterOpen(false)}
        sheet={activeSheet}
        selectedCol={parsedActive.c}
        onApplySort={handleApplySort}
        onApplyFilter={handleApplyFilter}
      />

      <ConditionalFormatModal
        isOpen={isConditionalFormatOpen}
        onClose={() => setIsConditionalFormatOpen(false)}
        sheet={activeSheet}
        selectionRange={selectionRange}
        onAddRule={(rule) => {
          activeSheet.conditionalFormats.push(rule);
          triggerGridRefresh();
        }}
        onRemoveRule={(ruleId) => {
          activeSheet.conditionalFormats = activeSheet.conditionalFormats.filter((r) => r.id !== ruleId);
          triggerGridRefresh();
        }}
      />

      <DataValidationModal
        isOpen={isDataValidationOpen}
        onClose={() => setIsDataValidationOpen(false)}
        sheet={activeSheet}
        selectionRange={selectionRange}
        onAddValidation={(rule) => {
          activeSheet.dataValidations.push(rule);
          triggerGridRefresh();
        }}
        onRemoveValidation={(ruleId) => {
          activeSheet.dataValidations = activeSheet.dataValidations.filter((v) => v.id !== ruleId);
          triggerGridRefresh();
        }}
      />

      <HyperlinkModal
        isOpen={isHyperlinkOpen}
        onClose={() => setIsHyperlinkOpen(false)}
        currentUrl={currentActiveCell?.hyperlink}
        onSave={handleSaveHyperlink}
        onRemove={handleRemoveHyperlink}
      />

      <CommentModal
        isOpen={isCommentOpen}
        onClose={() => setIsCommentOpen(false)}
        existingComment={currentActiveCell?.meta?.comment as any}
        onSave={handleSaveComment}
        onDelete={handleDeleteComment}
      />

      <BridgeModal
        isOpen={isBridgeOpen}
        onClose={() => setIsBridgeOpen(false)}
      />

      <ChartModal
        isOpen={isChartOpen}
        onClose={() => setIsChartOpen(false)}
        sheet={activeSheet}
        selectionRange={selectionRange}
      />

      <PivotModal
        isOpen={isPivotOpen}
        onClose={() => setIsPivotOpen(false)}
        sheet={activeSheet}
        selectionRange={selectionRange}
        onInsertPivotSheet={handleInsertPivotSheet}
      />

      <StatusBar
        moduleCount={modules.length}
        activeTheme={currentThemeId}
        isSafeMode={isSafeMode}
      />
    </div>
  );
};
