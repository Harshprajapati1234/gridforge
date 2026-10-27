export interface GridForgeTheme {
    id: string;
    name: string;
    type: 'light' | 'dark';
    colors: Record<string, string>;
    typography: Record<string, string>;
    borders: Record<string, string>;
    elevation: Record<string, string>;
}
export declare function applyThemeToDocument(theme: GridForgeTheme): void;
//# sourceMappingURL=tokens.d.ts.map