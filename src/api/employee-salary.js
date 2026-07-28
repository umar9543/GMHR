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

/**
 * Fetches the employee salary sheet (either existing or a generated template).
 */
export async function getEmployeeSalarySheet(locationId, month, year) {
  return apiFetch(`/api/EmployeeSalary/GenerateSheet?locationId=${locationId}&month=${month}&year=${year}`);
}

/**
 * Saves a new employee salary sheet.
 */
export async function saveEmployeeSalarySheet(payload) {
  return apiFetch(`/api/EmployeeSalary/SaveSheet`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetches the summary list of all saved salary sheets.
 */
export async function getSalarySheets() {
  return apiFetch(`/api/EmployeeSalary/GetSheets`);
}

/**
 * Updates an existing employee salary sheet.
 */
export async function updateEmployeeSalarySheet(id, payload) {
  return apiFetch(`/api/EmployeeSalary/UpdateSheet/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetches the payroll report data.
 */
export async function getPayRollReport(locationId, month, year) {
  return apiFetch(`/api/EmployeeSalary/GetPayRollReport?locationId=${locationId}&month=${month}&year=${year}`);
}
