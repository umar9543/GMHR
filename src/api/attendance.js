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
 * Only employees in service are offered: the pickers are used to mark and
 * report attendance, and a discharged guard cannot be on a sheet. The paged
 * list endpoint is used rather than the dropdown one because it takes a status;
 * pass includeInactive to ask for everybody.
 */
export async function getEmployeeOptions(search = '', pageSize = 50, includeInactive = false) {
  const params = new URLSearchParams({
    page: '1',
    pageSize: String(pageSize),
    status: includeInactive ? 'all' : 'Active',
  });
  if (search) params.append('search', search);

  const res = await apiFetch(`/api/employee/paged?${params.toString()}`);
  return (res.records || res.Records || []).map((row) => ({
    id: row.id ?? row.Id,
    name:
      row.name ??
      `${row.firstName ?? row.FirstName ?? ''} ${row.lastName ?? row.LastName ?? ''}`.trim(),
  }));
}

/**
 * The ids of every employee in service, for screens that receive rows covering
 * the whole workforce and show only the serving ones.
 */
export async function getActiveEmployeeIds() {
  const ids = new Set();
  let page = 1;
  for (;;) {
    const params = new URLSearchParams({ page: String(page), pageSize: '1000', status: 'Active' });
    // eslint-disable-next-line no-await-in-loop
    const res = await apiFetch(`/api/employee/paged?${params.toString()}`);
    const rows = res.records || res.Records || [];
    rows.forEach((row) => ids.add(Number(row.id ?? row.Id)));
    const total = res.totalCount ?? res.TotalCount ?? ids.size;
    if (!rows.length || ids.size >= total) return ids;
    page += 1;
  }
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

/**
 * One employee's month, day by day, from both attendance sources: what this app
 * marked and what came from the legacy HR system. Each day says which source it
 * came from, so the screen can show where a mark originates.
 */
export async function getEmployeeMonth(employeeId, year, month) {
  const params = new URLSearchParams({
    employeeId: String(employeeId),
    year: String(year),
    month: String(month),
  });
  return apiFetch(`/api/payroll/employee-month?${params.toString()}`);
}

/**
 * Saves the edited days of one employee. A day sent with an empty mark is
 * cleared; the legacy mark for that day, if any, then applies again.
 */
export async function saveEmployeeMonth(empId, days) {
  return apiFetch(`/api/payroll/employee-month`, {
    method: 'PUT',
    body: JSON.stringify({ empId, days }),
  });
}

/**
 * The day's guards, one line each. Empty clientIds means every site.
 */
export async function getDailyByEmployee(dateStr, clientIds = []) {
  const params = new URLSearchParams({ date: dateStr });
  if (clientIds.length) params.append('clientIds', clientIds.join(','));

  const res = await apiFetch(`/api/Report/DailyByEmployee?${params.toString()}`);
  return {
    date: res.date ?? res.Date,
    records: (res.records ?? res.Records ?? []).map((r) => ({
      empId: r.empId ?? r.EmpId,
      employeeName: r.employeeName ?? r.EmployeeName ?? '',
      clientId: r.clientId ?? r.ClientId,
      clientName: r.clientName ?? r.ClientName ?? '',
      groupName: r.groupName ?? r.GroupName ?? '',
      shift: r.shift ?? r.Shift ?? 'D',
      attendance: r.attendance ?? r.Attendance ?? '',
      category: r.category ?? r.Category ?? '',
      otClientId: r.otClientId ?? r.OtClientId ?? null,
      otClientName: r.otClientName ?? r.OtClientName ?? '',
      ovCategory: r.ovCategory ?? r.OvCategory ?? '',
    })),
  };
}
