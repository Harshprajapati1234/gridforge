import ExcelJS from 'exceljs';
import { WorkbookModel } from '../model/workbook';
import { SheetModel } from '../model/sheet';
import { parseAddress } from '../model/cell';

function toArgb(color?: string): string | undefined {
  if (!color) return undefined;
  const clean = color.replace('#', '').trim().toUpperCase();
  if (clean.length === 6) return `FF${clean}`;
  if (clean.length === 8) return clean;
  if (clean.length === 3) {
    const expanded = clean.split('').map((ch) => ch + ch).join('');
    return `FF${expanded}`;
  }
  return `FF${clean.padEnd(6, '0')}`;
}

function fromArgb(argb?: string): string | undefined {
  if (!argb) return undefined;
  const clean = String(argb).trim().toUpperCase();
  if (clean.length === 8) {
    return `#${clean.slice(2)}`;
  }
  if (clean.length === 6) {
    return `#${clean}`;
  }
  return `#${clean}`;
}

export class XlsxHandler {
  static async exportBuffer(wb: WorkbookModel): Promise<Uint8Array> {
    const excelWb = new ExcelJS.Workbook();
    excelWb.creator = 'GridForge';
    excelWb.lastModifiedBy = 'GridForge';
    excelWb.created = new Date();

    for (const sh of wb.sheets) {
      const ws = excelWb.addWorksheet(sh.name);

      // Frozen panes
      if (sh.freezeRows > 0 || sh.freezeCols > 0) {
        ws.views = [{ state: 'frozen', xSplit: sh.freezeCols, ySplit: sh.freezeRows }];
      }

      // Column widths
      for (const [c, w] of sh.colWidths.entries()) {
        ws.getColumn(c + 1).width = Math.round(w / 7.5);
      }

      // Row heights
      for (const [r, h] of sh.rowHeights.entries()) {
        ws.getRow(r + 1).height = Math.round(h * 0.75);
      }

      // Cells
      for (const cell of sh.getAllCells()) {
        const row = ws.getRow(cell.r + 1);
        const wsCell = row.getCell(cell.c + 1);

        if (cell.f) {
          const formulaStr = cell.f.startsWith('=') ? cell.f.slice(1) : cell.f;
          wsCell.value = { formula: formulaStr, result: cell.v as any };
        } else {
          wsCell.value = cell.v as any;
        }

        if (cell.fmt) {
          wsCell.numFmt = cell.fmt;
        }

        // Styles
        if (cell.style) {
          wsCell.font = {
            bold: cell.style.bold,
            italic: cell.style.italic,
            underline: cell.style.underline,
            size: cell.style.fontSize,
            name: cell.style.fontFamily,
            color: cell.style.color ? { argb: toArgb(cell.style.color) } : undefined
          };
          if (cell.style.bgColor) {
            wsCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: toArgb(cell.style.bgColor)! }
            };
          }
          if (cell.style.align || cell.style.verticalAlign || cell.style.wrapText) {
            wsCell.alignment = {
              horizontal: cell.style.align as any,
              vertical: cell.style.verticalAlign as any,
              wrapText: cell.style.wrapText
            };
          }
        }
      }

      // Merges
      for (const m of sh.mergedCells) {
        ws.mergeCells(m.startRow + 1, m.startCol + 1, m.endRow + 1, m.endCol + 1);
      }
    }

    const buffer = await excelWb.xlsx.writeBuffer();
    return new Uint8Array(buffer);
  }

  static async importBuffer(buffer: Uint8Array | ArrayBuffer): Promise<WorkbookModel> {
    const excelWb = new ExcelJS.Workbook();
    // @ts-ignore
    await excelWb.xlsx.load(buffer);

    const wb = new WorkbookModel('Imported.xlsx');
    wb.sheets = [];

    const unsupported: string[] = [];
    if ((excelWb as any).model?.vbaProject || (excelWb as any).vba) {
      unsupported.push('VBA Macros / Macro Automations');
    }

    excelWb.eachSheet((ws, sheetId) => {
      const sh = new SheetModel(String(sheetId), ws.name);

      // Views / Freeze panes
      if (ws.views && ws.views.length > 0) {
        const v = ws.views[0];
        if (v.state === 'frozen') {
          sh.freezeCols = v.xSplit || 0;
          sh.freezeRows = v.ySplit || 0;
        }
      }

      // Columns
      ws.columns?.forEach((col, idx) => {
        if (col.width) sh.setColWidth(idx, Math.round(col.width * 7.5));
      });

      // Cells & Rows
      ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const r = rowNumber - 1;
        if (row.height) {
          sh.setRowHeight(r, Math.round(row.height / 0.75));
        }

        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const c = colNumber - 1;
          let val: any = cell.value;
          let formula: string | undefined;

          if (val && typeof val === 'object' && 'formula' in val) {
            formula = `=${val.formula}`;
            val = val.result !== undefined ? val.result : null;
          }

          const style: any = {};
          if (cell.font) {
            if (cell.font.bold) style.bold = true;
            if (cell.font.italic) style.italic = true;
            if (cell.font.underline) style.underline = true;
            if (cell.font.size) style.fontSize = cell.font.size;
            if (cell.font.name) style.fontFamily = cell.font.name;
            if (cell.font.color && 'argb' in cell.font.color && cell.font.color.argb) {
              style.color = fromArgb(cell.font.color.argb);
            }
          }

          if (cell.fill && cell.fill.type === 'pattern' && (cell.fill as any).fgColor?.argb) {
            style.bgColor = fromArgb((cell.fill as any).fgColor.argb);
          }

          if (cell.alignment) {
            if (cell.alignment.horizontal) style.align = cell.alignment.horizontal as any;
            if (cell.alignment.vertical) style.verticalAlign = cell.alignment.vertical as any;
            if (cell.alignment.wrapText) style.wrapText = cell.alignment.wrapText;
          }

          const fmt = cell.numFmt || undefined;

          sh.setCell(r, c, { v: val, f: formula, style, fmt });
        });
      });

      // Merges
      const rawMerges: any[] = (ws.model as any)?.merges || (ws as any)._merges || [];
      for (const item of rawMerges) {
        const rangeStr = typeof item === 'string' ? item : (item?.range || item?.model || String(item));
        if (typeof rangeStr === 'string' && rangeStr.includes(':')) {
          const parts = rangeStr.split(':');
          const p1 = parseAddress(parts[0]);
          const p2 = parseAddress(parts[1]);
          if (p1 && p2) {
            sh.mergedCells.push({
              startRow: Math.min(p1.r, p2.r),
              startCol: Math.min(p1.c, p2.c),
              endRow: Math.max(p1.r, p2.r),
              endCol: Math.max(p1.c, p2.c)
            });
          }
        }
      }

      // Check unsupported features
      if ((ws as any)._pivotTables?.length || (ws.model as any)?.pivotTables?.length) {
        if (!unsupported.includes('Pivot Tables')) unsupported.push('Pivot Tables');
      }
      if ((ws as any)._drawings?.length || (ws as any)._media?.length || ((ws as any).getImages && (ws as any).getImages().length)) {
        if (!unsupported.includes('Embedded Charts and Drawings')) unsupported.push('Embedded Charts and Drawings');
      }
      if ((ws as any)._sparklines?.length) {
        if (!unsupported.includes('Sparklines')) unsupported.push('Sparklines');
      }
      if ((ws as any)._slicers?.length) {
        if (!unsupported.includes('Slicers / Interactive Filters')) unsupported.push('Slicers / Interactive Filters');
      }

      wb.sheets.push(sh);
    });

    if (wb.sheets.length > 0) wb.activeSheetId = wb.sheets[0].id;
    wb.unsupportedFeatures = unsupported;
    return wb;
  }
}
