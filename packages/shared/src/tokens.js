"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyThemeToDocument = applyThemeToDocument;
function applyThemeToDocument(theme) {
    if (typeof document === 'undefined')
        return;
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([k, v]) => {
        root.style.setProperty(`--gf-color-${kebab(k)}`, v);
    });
    Object.entries(theme.typography).forEach(([k, v]) => {
        root.style.setProperty(`--gf-font-${kebab(k)}`, v);
    });
    Object.entries(theme.borders).forEach(([k, v]) => {
        root.style.setProperty(`--gf-border-${kebab(k)}`, v);
    });
    Object.entries(theme.elevation).forEach(([k, v]) => {
        root.style.setProperty(`--gf-elevation-${kebab(k)}`, v);
    });
    root.setAttribute('data-theme-type', theme.type);
    root.setAttribute('data-theme-id', theme.id);
}
function kebab(s) {
    return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
//# sourceMappingURL=tokens.js.map