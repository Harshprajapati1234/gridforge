export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string; // hex color e.g. #000000
  bgColor?: string; // hex color e.g. #ffffff
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  wrapText?: boolean;
  border?: {
    top?: boolean;
    bottom?: boolean;
    left?: boolean;
    right?: boolean;
    color?: string;
  };
}

export interface CellData {
  r: number; // 0-indexed row
  c: number; // 0-indexed col
  v: string | number | boolean | null; // evaluated / display value
  f?: string; // formula starting with '=' or plain formula text
  fmt?: string; // format pattern, e.g. '0.00%', '₹#,##0.00', 'yyyy-mm-dd'
  style?: CellStyle;
  hyperlink?: string;
  meta?: Record<string, unknown>;
}

export function cellAddress(r: number, c: number): string {
  let colStr = '';
  let tempCol = c;
  while (tempCol >= 0) {
    colStr = String.fromCharCode((tempCol % 26) + 65) + colStr;
    tempCol = Math.floor(tempCol / 26) - 1;
  }
  return `${colStr}${r + 1}`;
}

export function parseAddress(addr: string): { r: number; c: number } | null {
  const match = /^([A-Z]+)(\d+)$/i.exec(addr.trim());
  if (!match) return null;
  const colStr = match[1].toUpperCase();
  let c = 0;
  for (let i = 0; i < colStr.length; i++) {
    c = c * 26 + (colStr.charCodeAt(i) - 64);
  }
  const r = parseInt(match[2], 10) - 1;
  return { r, c: c - 1 };
}
