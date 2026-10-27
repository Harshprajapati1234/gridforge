import { CellStyle } from './cell';

export interface ConditionalFormatRule {
  id: string;
  range: { startRow: number; startCol: number; endRow: number; endCol: number };
  type: 'cellValue' | 'textContains' | 'colorScale' | 'dataBars';
  operator?: 'greaterThan' | 'lessThan' | 'equal' | 'notEqual' | 'between';
  values?: (number | string)[];
  text?: string;
  style?: CellStyle;
  minColor?: string;
  midColor?: string;
  maxColor?: string;
}

export interface DataValidationRule {
  id: string;
  range: { startRow: number; startCol: number; endRow: number; endCol: number };
  type: 'list' | 'wholeNumber' | 'decimal' | 'date' | 'textLength';
  operator?: 'between' | 'equal' | 'greaterThan' | 'lessThan';
  values?: (number | string)[];
  listOptions?: string[];
  errorStyle: 'stop' | 'warning' | 'info';
  errorTitle?: string;
  errorMessage?: string;
}

export interface FilterCriteria {
  col: number;
  selectedValues?: Set<string>;
  textFilter?: { operator: 'contains' | 'equals' | 'startsWith' | 'endsWith'; value: string };
  numberFilter?: { operator: 'greaterThan' | 'lessThan' | 'equal' | 'between'; value: number; value2?: number };
}

export interface SortRule {
  col: number;
  ascending: boolean;
  customOrder?: string[];
}
