import { APP_API } from 'src/config-global';

function getBearerToken() {
  try {
    return JSON.parse(localStorage.getItem('UserData'))?.token || '';
  } catch {
    return '';
  }
}

async function apiFetch(path, options = {}) {
  const token = getBearerToken();
  const url = `${APP_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json();
}

function buildQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      qs.append(key, value);
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

/**
 * Fetches ONE PAGE of the employee salary sheet (either the saved sheet or a
 * generated template). The sheet can run to 50k rows, so it is always paged
 * server side.
 *
 * @param {object}  opts
 * @param {number?} opts.locationId  omit / 0 to build the sheet across ALL locations
 * @param {number}  opts.month
 * @param {number}  opts.year
 * @param {number}  opts.page        1-based
 * @param {number}  opts.pageSize    max 1000
 * @param {string?} opts.search      name / code filter
 * @param {string?} opts.source      'auto' (default) | 'saved' | 'generate'
 */
export async function getEmployeeSalarySheet({
  locationId,
  month,
  year,
  page = 1,
  pageSize = 100,
  search = '',
  source = 'auto',
}) {
  return apiFetch(
    `/api/EmployeeSalary/GenerateSheet${buildQuery({
      locationId: locationId > 0 ? locationId : undefined,
      month,
      year,
      page,
      pageSize,
      search,
      source,
    })}`
  );
}

/**
 * Walks every page of a salary sheet and returns the rows as one array.
 *
 * Only use this when the whole set is genuinely needed (saving, exporting) - at
 * 50k rows this is many round trips and a lot of memory. Screens should page.
 *
 * @param {object}   opts        same shape as getEmployeeSalarySheet, minus paging
 * @param {object}   [control]
 * @param {number}   [control.pageSize=1000]   server caps this at 1000
 * @param {Function} [control.onProgress]      called with (collected, total)
 * @param {Function} [control.fetchPage]       override the fetcher (e.g. by sheet id)
 */
export async function fetchAllSalarySheetRows(opts, { pageSize = 1000, onProgress, fetchPage } = {}) {
  const load = fetchPage || ((page) => getEmployeeSalarySheet({ ...opts, page, pageSize }));

  const collected = [];
  let total = Infinity;

  for (let page = 1; collected.length < total; page += 1) {
    // Pages are walked in order; each request depends on the previous finishing.
    // eslint-disable-next-line no-await-in-loop
    const res = await load(page, pageSize);
    const details = res?.sheet?.details || [];

    total = res?.pagination?.totalCount ?? details.length;
    collected.push(...details);
    onProgress?.(collected.length, total);

    if (details.length === 0) break; // guard against a bad/empty page
  }

  return collected;
}

/**
 * Headcount + saved-sheet status for every location in a period. Lets the UI offer
 * an "All Locations" run without first pulling every employee row.
 */
export async function getSalarySheetLocationSummary(month, year) {
  return apiFetch(`/api/EmployeeSalary/LocationSummary${buildQuery({ month, year })}`);
}

/**
 * Saves a new employee salary sheet in a single request. Only safe for small
 * sheets - use saveSalarySheetChunked for anything sizeable.
 */
export async function saveEmployeeSalarySheet(payload) {
  return apiFetch(`/api/EmployeeSalary/SaveSheet`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Opens a sheet for chunked writing and returns its master id.
 */
export async function beginSalarySheetSave({ locationId, monthId, yearId, replace = true }) {
  return apiFetch(`/api/EmployeeSalary/SaveSheetBegin`, {
    method: 'POST',
    body: JSON.stringify({
      locationId,
      monthId,
      yearId,
      currentDate: new Date().toISOString(),
      replace,
    }),
  });
}

/**
 * Posts one chunk of detail rows into an already-opened sheet.
 */
export async function saveSalarySheetChunk(masterId, details) {
  return apiFetch(`/api/EmployeeSalary/SaveSheetChunk/${masterId}`, {
    method: 'POST',
    body: JSON.stringify({ details }),
  });
}

/**
 * Writes a whole sheet in bounded chunks so a 50k-row payload never travels as a
 * single request body.
 *
 * @param {object}   header       { locationId, monthId, yearId, replace }
 * @param {Array}    details      every row to persist
 * @param {object}   [options]
 * @param {number}   [options.chunkSize=2000]
 * @param {Function} [options.onProgress] called with (written, total)
 */
export async function saveSalarySheetChunked(header, details, { chunkSize = 2000, onProgress } = {}) {
  const { employeeSalaryMstID } = await beginSalarySheetSave(header);

  let written = 0;
  for (let i = 0; i < details.length; i += chunkSize) {
    const chunk = details.slice(i, i + chunkSize);
    // Chunks must land in order and the server commits each one, so these are
    // deliberately sequential rather than parallel.
    // eslint-disable-next-line no-await-in-loop
    await saveSalarySheetChunk(employeeSalaryMstID, chunk);
    written += chunk.length;
    onProgress?.(written, details.length);
  }

  return { employeeSalaryMstID, rowsInserted: written };
}

/**
 * Fetches a page of the saved salary sheet list.
 */
export async function getSalarySheets({ page = 1, pageSize = 100, locationId, month, year } = {}) {
  return apiFetch(
    `/api/EmployeeSalary/GetSheets${buildQuery({
      page,
      pageSize,
      locationId: locationId > 0 ? locationId : undefined,
      month,
      year,
    })}`
  );
}

/**
 * Fetches one page of a saved salary sheet by its master id.
 */
export async function getSalarySheetById(id, { page = 1, pageSize = 100, search = '' } = {}) {
  return apiFetch(`/api/EmployeeSalary/GetSheetById/${id}${buildQuery({ page, pageSize, search })}`);
}

/**
 * Updates an existing employee salary sheet in a single request.
 */
export async function updateEmployeeSalarySheet(id, payload) {
  return apiFetch(`/api/EmployeeSalary/UpdateSheet/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetches the payroll report data (legacy stored-procedure endpoint, single
 * location, unpaged). Kept for any caller that still needs it.
 */
export async function getPayRollReport(locationId, month, year) {
  return apiFetch(`/api/EmployeeSalary/GetPayRollReport${buildQuery({ locationId, month, year })}`);
}

/**
 * Fetches ONE PAGE of the payroll report.
 *
 * @param {object}  opts
 * @param {number?} opts.locationId  omit / 0 for every location
 * @param {number}  opts.month
 * @param {number}  opts.year
 * @param {number}  opts.page        1-based
 * @param {number}  opts.pageSize    max 1000
 * @param {string?} opts.search
 */
export async function getPayRollReportPage({
  locationId,
  month,
  year,
  page = 1,
  pageSize = 100,
  search = '',
}) {
  return apiFetch(
    `/api/EmployeeSalary/PayRollReportPaged${buildQuery({
      locationId: locationId > 0 ? locationId : undefined,
      month,
      year,
      page,
      pageSize,
      search,
    })}`
  );
}

/**
 * Walks every page of the payroll report. Only for building the PDF - screens
 * should page instead.
 *
 * @param {object}   opts        same shape as getPayRollReportPage, minus paging
 * @param {object}   [control]
 * @param {number}   [control.pageSize=1000]
 * @param {Function} [control.onProgress] called with (collected, total)
 */
export async function fetchAllPayRollReportRows(opts, { pageSize = 1000, onProgress } = {}) {
  const collected = [];
  let total = Infinity;
  let totals = null;

  for (let page = 1; collected.length < total; page += 1) {
    // Ordered walk; each request depends on the previous finishing.
    // eslint-disable-next-line no-await-in-loop
    const res = await getPayRollReportPage({ ...opts, page, pageSize });
    const records = res?.records || [];

    total = res?.pagination?.totalCount ?? records.length;
    totals = res?.totals ?? totals;
    collected.push(...records);
    onProgress?.(collected.length, total);

    if (records.length === 0) break;
  }

  return { records: collected, totals };
}
