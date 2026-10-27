import ExcelJS from 'exceljs';
import { WorkbookModel } from '../model/workbook';
import { SheetModel } from '../model/sheet';

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

        // Styles
        if (cell.style) {
          wsCell.font = {
            bold: cell.style.bold,
            italic: cell.style.italic,
            underline: cell.style.underline,
            size: cell.style.fontSize,
            color: cell.style.color ? { argb: cell.style.color.replace('#', '') } : undefined
          };
          if (cell.style.bgColor) {
            wsCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: cell.style.bgColor.replace('#', '') }
            };
          }
          if (cell.style.align) {
            wsCell.alignment = { horizontal: cell.style.align as any };
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

      // Cells
      ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const r = rowNumber - 1;
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
          }

          sh.setCell(r, c, { v: val, f: formula, style });
        });
      });

      wb.sheets.push(sh);
    });

    if (wb.sheets.length > 0) wb.activeSheetId = wb.sheets[0].id;
    return wb;
  }
}
