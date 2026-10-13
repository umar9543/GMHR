import { APP_API } from 'src/config-global';

// ---------------------------------------------------------------------------
// What the Attendance Documents report is made of, read once and shared by
// the PDF and the Word builders so the two can never say different things.
//
// Every guard's scans come from GET /api/employee/{id}/information-form, the
// same call the Employee Information Form uses; the client's contract dates
// from GET /api/HrClient/{id}.
// ---------------------------------------------------------------------------

// How many employees are fetched at once. The scans are large, so the whole
// sheet is not asked for in one breath.
const BATCH = 4;

// The base64 prefix identifies the real format, whatever the column claimed.
const FORMAT_BY_PREFIX = [
  ['/9j/', 'image/jpeg', 'jpg'],
  ['iVBORw0KGgo', 'image/png', 'png'],
  ['R0lGOD', 'image/gif', 'gif'],
  ['Qk', 'image/bmp', 'bmp'],
  ['UklGR', 'image/webp', 'webp'],
];

const formatOf = (base64) => FORMAT_BY_PREFIX.find(([prefix]) => base64.startsWith(prefix));

export const asDataUrl = (base64) => {
  if (!base64) return null;
  const match = formatOf(base64);
  return `data:${match ? match[1] : 'image/jpeg'};base64,${base64}`;
};

/** The scan's bytes and its short type name, for builders that want raw data. */
export const asImage = (base64) => {
  if (!base64) return null;
  const match = formatOf(base64);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { bytes, type: match ? match[2] : 'jpg' };
};

export const text = (value) => String(value ?? '').trim();

/** 02/10/2026 */
export const dmy = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return text(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** Friday 02 October 2026, as the legacy bio-data report dates itself. */
export const longDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return text(value);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

/** The employee's own record, whatever case the API answered in. */
export const field = (employee, ...names) => {
  const found = names.find((name) => text(employee?.[name]));
  return found ? text(employee[found]) : '';
};

/**
 * The strength, counted off the sheet itself rather than the client's
 * requirement: how many of each category are on by day and by night.
 */
export function strengthOf(rows) {
  const byCategory = new Map();

  rows.forEach((row) => {
    const category = text(row.category) || 'Unspecified';
    const line = byCategory.get(category) ?? { category, day: 0, night: 0 };
    if (text(row.shift).toUpperCase() === 'N') line.night += 1;
    else line.day += 1;
    byCategory.set(category, line);
  });

  const lines = [...byCategory.values()].sort((a, b) => a.category.localeCompare(b.category));
  return {
    lines,
    day: lines.reduce((sum, l) => sum + l.day, 0),
    night: lines.reduce((sum, l) => sum + l.night, 0),
    total: rows.length,
  };
}

async function getJson(path) {
  try {
    const res = await fetch(`${APP_API}${path}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** The whole sheet's documents, a few at a time. */
async function loadAll(rows, onProgress) {
  const out = new Map();
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    // The batches run one after another on purpose: the scans are large, and
    // asking for the whole sheet at once is what makes the server struggle.
    // eslint-disable-next-line no-await-in-loop
    const loaded = await Promise.all(
      slice.map((row) => getJson(`/api/employee/${row.empId}/information-form`))
    );
    slice.forEach((row, n) => out.set(row.empId, loaded[n]));
    onProgress?.(Math.min(i + BATCH, rows.length), rows.length);
  }
  return out;
}

/**
 * Everything both builders need. The sheet is for one client when every
 * marked guard is on the same one; otherwise the location it was taken at is
 * what names it, and there is no single contract to quote.
 */
export async function prepareAttendanceDocuments(rows, { locationName = '', onProgress } = {}) {
  if (!rows?.length) throw new Error('There are no guards to report');

  const documents = await loadAll(rows, onProgress);

  const clientIds = [...new Set(rows.map((row) => row.clientId).filter(Boolean))];
  const single = clientIds.length === 1 ? rows.find((row) => row.clientId === clientIds[0]) : null;
  const client = single ? await getJson(`/api/HrClient/${single.clientId}`) : null;

  return {
    documents,
    single,
    client,
    heading: single ? text(single.clientName) : text(locationName),
    strength: strengthOf(rows),
    missing: rows.filter((row) => !documents.get(row.empId)).map((row) => row.empId),
  };
}
