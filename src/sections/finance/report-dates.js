// Dates for the finance report screens.

/** yyyy-MM-dd for the API, from the date the picker holds (local, not UTC). */
export const toIso = (d) => {
  if (!d || Number.isNaN(d.getTime?.())) return undefined;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** 1 July of the financial year the date falls in (the year runs July to June). */
export const fyStart = (d = new Date()) =>
  new Date(d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1, 6, 1);

/** 30 June closing the last complete financial year. */
export const lastFyEnd = (d = new Date()) => new Date(fyStart(d).getFullYear(), 5, 30);

/** First day of the month. */
export const monthStart = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

/** dd/MM/yyyy from an API date. */
export const dmyText = (v) => {
  if (!v) return '';
  const [y, m, d] = String(v).slice(0, 10).split('-');
  return d ? `${d}/${m}/${y}` : String(v);
};
