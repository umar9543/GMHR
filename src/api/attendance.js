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
 * Fetches an attendance sheet for a location and date.
 */
export async function getAttendanceSheet(locationId, dateStr) {
  return apiFetch(`/api/payroll/sheet?locationId=${locationId}&date=${dateStr}`);
}

/**
 * Saves a new attendance sheet.
 */
export async function saveAttendanceSheet(payload) {
  return apiFetch(`/api/payroll`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Updates an existing attendance sheet.
 */
export async function updateAttendanceSheet(masterId, payload) {
  return apiFetch(`/api/payroll/${masterId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetches the month-wise attendance report from the Stored Procedure endpoint.
 */
export async function getAttendanceMonthWise(year, month) {
  return apiFetch(`/api/Report/AttendanceMonthWise?year=${year}&month=${month}`);
}
