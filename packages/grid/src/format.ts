export function formatCellValue(val: unknown, fmt?: string): string {
  if (val == null) return '';
  if (!fmt || fmt === 'General') return String(val);

  const num =
    typeof val === 'number'
      ? val
      : typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))
      ? Number(val)
      : NaN;

  if (isNaN(num)) {
    return String(val);
  }

  const upperFmt = fmt.toUpperCase();

  // Percentage
  if (fmt.includes('%')) {
    const decimals = fmt.includes('.') ? (fmt.split('.')[1] || '').replace(/[^0#]/g, '').length : 0;
    return (num * 100).toFixed(decimals) + '%';
  }

  // Currency
  if (fmt.includes('$') || fmt.includes('₹') || fmt.includes('€') || fmt.includes('£')) {
    const symbol = fmt.includes('₹') ? '₹' : fmt.includes('€') ? '€' : fmt.includes('£') ? '£' : '$';
    const dec = fmt.includes('.') ? (fmt.split('.')[1] || '').replace(/[^0#]/g, '').length : 0;
    const parts = num.toFixed(dec).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${symbol}${parts.join('.')}`;
  }

  // Thousands separator and decimal formatting
  if (fmt.includes('#,##0') || fmt.includes('0.00') || fmt.includes(',')) {
    const decimals = (fmt.split('.')[1] || '').replace(/[^0#]/g, '').length;
    const dec = fmt.includes('.') ? (decimals > 0 ? decimals : 2) : 0;
    const parts = num.toFixed(dec).split('.');
    if (fmt.includes('#,##0') || fmt.includes(',')) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return parts.join('.');
  }

  // Date formats
  if (upperFmt.includes('YY') || upperFmt.includes('MM') || upperFmt.includes('DD')) {
    try {
      const d =
        typeof val === 'number' && val > 1000
          ? new Date(Math.round((val - 25569) * 86400 * 1000))
          : new Date(val as any);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        if (upperFmt.includes('YYYY-MM-DD')) return `${yyyy}-${mm}-${dd}`;
        if (upperFmt.includes('DD/MM/YYYY')) return `${dd}/${mm}/${yyyy}`;
        if (upperFmt.includes('MM/DD/YYYY')) return `${mm}/${dd}/${yyyy}`;
        return d.toLocaleDateString();
      }
    } catch {}
  }

  return String(num);
}
