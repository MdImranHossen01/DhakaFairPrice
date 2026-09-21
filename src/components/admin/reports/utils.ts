export const fmt = (n: number | undefined | null) =>
  `TK. ${(n ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtQty = (n: number | undefined | null, unit = 'pcs') =>
  `${(n ?? 0).toLocaleString('en-BD')} ${unit}`;

export const fmtDate = (d: string | Date | undefined | null) => {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(d);
  }
};

export const today = () => new Date().toISOString().split('T')[0];
