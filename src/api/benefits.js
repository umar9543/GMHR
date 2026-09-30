import { APP_API } from 'src/config-global';

// ----------------------------------------------------------------------
// Benefits and Deduction: what an employee is paid on top of salary, and what
// is taken off it. Both tabs are the same shape, so one set of helpers serves
// them, keyed by 'allowances' or 'deductions'.
// ----------------------------------------------------------------------

function getBearerToken() {
  try {
    return JSON.parse(localStorage.getItem('UserData'))?.token || '';
  } catch {
    return '';
  }
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${APP_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getBearerToken()}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      message = JSON.parse(body).message || body;
    } catch {
      /* the body was not JSON; show it as it came */
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
  return res.json();
}

function buildQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') qs.append(key, String(value));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

const BASE = '/api/BenefitDeduction';

/** The allowance kinds, for the picker. */
export async function getAllowanceTypes() {
  return apiFetch(`${BASE}/allowance-types`);
}

/** The deduction kinds, for the picker. */
export async function getDeductionTypes() {
  return apiFetch(`${BASE}/deduction-types`);
}

/** A page of entries. `kind` is 'allowances' or 'deductions'. */
export async function getBenefitEntries(kind, { page = 1, pageSize = 25, search, employeeId, typeId, from, to } = {}) {
  return apiFetch(
    `${BASE}/${kind}${buildQuery({ page, pageSize, search, employeeId, typeId, from, to })}`
  );
}

/** One entry, for the edit form. */
export async function getBenefitEntry(kind, id) {
  return apiFetch(`${BASE}/${kind}/${id}`);
}

export async function createBenefitEntry(kind, payload) {
  return apiFetch(`${BASE}/${kind}`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateBenefitEntry(kind, id, payload) {
  return apiFetch(`${BASE}/${kind}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteBenefitEntry(kind, id) {
  return apiFetch(`${BASE}/${kind}/${id}`, { method: 'DELETE' });
}

/** One line per employee: how many entries they have and what they come to. */
export async function getBenefitSummary(kind, { page = 1, pageSize = 25, search, typeId } = {}) {
  return apiFetch(`${BASE}/summary/${kind}${buildQuery({ page, pageSize, search, typeId })}`);
}

/** Everything one employee has on this tab - their history. */
export async function getEmployeeBenefits(kind, employeeId) {
  return apiFetch(`${BASE}/${kind}/employee/${employeeId}`);
}

/** What Refresh Salary Sheet would write, without writing it. */
export async function previewSalarySheetRefresh({ employeeId, month, year, deductionsFrom = 'previous' }) {
  return apiFetch(`${BASE}/salary-sheet-preview${buildQuery({ employeeId, month, year, deductionsFrom })}`);
}

/**
 * The same for every guard on a month's sheet: standing allowances, the
 * month's instalments and one-offs, and each guard's EOBI.
 */
export async function refreshSalarySheetMonth({ month, year, deductionsFrom = 'current' }) {
  return apiFetch(`${BASE}/refresh-salary-sheet/month`, {
    method: 'POST',
    body: JSON.stringify({ month, year, deductionsFrom }),
  });
}

/** Pushes the employee's allowances and deductions onto a month's salary sheet. */
export async function refreshSalarySheet(payload) {
  return apiFetch(`${BASE}/refresh-salary-sheet`, { method: 'POST', body: JSON.stringify(payload) });
}

/**
 * One employee's entries, applied to every month from this one onwards that
 * already has a salary sheet row. Months marked Paid are left as they were.
 */
export async function refreshEmployeeMonths({ employeeId, month, year, deductionsFrom = 'current' }) {
  return apiFetch(`${BASE}/refresh-salary-sheet/employee-months`, {
    method: 'POST',
    body: JSON.stringify({ employeeId, month, year, deductionsFrom }),
  });
}
