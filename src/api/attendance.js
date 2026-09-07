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
 * Fetches an attendance sheet for a date.
 *
 * Attendance belongs to a CLIENT site - that is where the guard actually works.
 * When a clientId is given the roster is the guards deployed there; locationId
 * is kept for the older company-branch behaviour.
 */
export async function getAttendanceSheet(locationId, dateStr, clientId) {
  const params = new URLSearchParams();

  if (clientId !== null && clientId !== undefined && clientId !== '') {
    params.append('clientId', clientId);
  } else if (locationId !== null && locationId !== undefined && locationId !== '') {
    params.append('locationId', locationId);
  }

  params.append('date', dateStr);

  return apiFetch(`/api/payroll/sheet?${params.toString()}`);
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
export async function getAttendanceMonthWise(year, month, empId) {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  // Optional: narrows the report to a single employee.
  if (empId) params.append('empId', String(empId));
  return apiFetch(`/api/Report/AttendanceMonthWise?${params.toString()}`);
}

/**
 * Paged, server-searched employee picker source.
 *
 * The endpoint returns untyped rows, so the keys arrive PascalCase (Id/Name)
 * rather than camelCase - they are normalised here.
 */
export async function getEmployeeOptions(search = '', pageSize = 50) {
  const params = new URLSearchParams({ page: '1', pageSize: String(pageSize) });
  if (search) params.append('search', search);

  const res = await apiFetch(`/api/Employee/dropdown?${params.toString()}`);
  return (res.records || res.Records || []).map((row) => ({
    id: row.id ?? row.Id,
    name: row.name ?? row.Name ?? '',
  }));
}

/**
 * Daily Parade State: contracted strength against guards on post, per client.
 * The API decides whether to read live sheets or migrated history for the date.
 */
export async function getParadeState(dateStr) {
  const res = await apiFetch(`/api/Report/ParadeState?date=${encodeURIComponent(dateStr)}`);
  return {
    date: res.date ?? res.Date,
    fromLiveSheet: res.fromLiveSheet ?? res.FromLiveSheet ?? false,
    records: (res.records ?? res.Records ?? []).map((r) => ({
      groupName: r.groupName ?? r.GroupName ?? '(no group)',
      clientId: r.clientId ?? r.ClientId,
      clientName: r.clientName ?? r.ClientName ?? '',
      reqDay: r.reqDay ?? r.ReqDay ?? 0,
      reqNight: r.reqNight ?? r.ReqNight ?? 0,
      reqTotal: r.reqTotal ?? r.ReqTotal ?? 0,
      preDay: r.preDay ?? r.PreDay ?? 0,
      preNight: r.preNight ?? r.PreNight ?? 0,
      otDay: r.otDay ?? r.OtDay ?? 0,
      otNight: r.otNight ?? r.OtNight ?? 0,
    })),
  };
}

/**
 * Monthly Parade State for one client site: every guard posted there that
 * month, with his mark and shift on each day.
 */
export async function getParadeStateMonthly(clientId, year, month) {
  const qs = new URLSearchParams({
    clientId: String(clientId),
    year: String(year),
    month: String(month),
  });
  const res = await apiFetch(`/api/Report/ParadeStateMonthly?${qs.toString()}`);
  return {
    year: res.year ?? res.Year,
    month: res.month ?? res.Month,
    daysInMonth: res.daysInMonth ?? res.DaysInMonth ?? 31,
    client: res.client ?? res.Client ?? null,
    records: (res.records ?? res.Records ?? []).map((r) => ({
      employeeId: r.employeeId ?? r.EmployeeId,
      employeeName: r.employeeName ?? r.EmployeeName ?? '',
      rank: r.rank ?? r.Rank ?? '',
      days: r.days ?? r.Days ?? {},
      present: r.present ?? r.Present ?? 0,
      absent: r.absent ?? r.Absent ?? 0,
      leave: r.leave ?? r.Leave ?? 0,
      overtime: r.overtime ?? r.Overtime ?? 0,
      dayShift: r.dayShift ?? r.DayShift ?? 0,
      nightShift: r.nightShift ?? r.NightShift ?? 0,
    })),
  };
}
