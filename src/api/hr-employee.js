/**
 * hr-employee.js
 * API service layer for the HrEmployees endpoints.
 * All calls go through the shared apibasemethods axios instance (APP_API base URL).
 *
 * Backend endpoints (SecuritySystem API):
 *   GET    /api/hremployees              → list / search employees
 *   GET    /api/hremployees/{id}         → full record for edit mode
 *   GET    /api/hremployees/nextcode     → generate next employee code
 *   GET    /api/hremployees/{id}/wives
 *   GET    /api/hremployees/{id}/children
 *   GET    /api/hremployees/{id}/surgeries
 *   GET    /api/hremployees/{id}/civilexp
 *   GET    /api/hremployees/{id}/uniformexp
 *   POST   /api/hremployees              → save (insert) or update
 *
 *   GET    /api/dropdowns?type=<name>    → all lookup lists
 */

import { useCallback } from 'react';

import { APP_API } from 'src/config-global';

import { useAuthFetch } from './apibasemethods';

// ─── Thin fetch wrappers used in plain (non-hook) contexts ────────────────────
// These use the raw fetch API with the bearer token from localStorage.
// For React hooks that need automatic re-auth use `useAuthFetch` instead.

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

// ─────────────────────────────────────────────────────────────────────────────
// Employee list / search
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a list of employees (up to 100).
 * @param {string} [code] - optional employee code to filter by
 */
export async function fetchHrEmployees(code = '') {
  const qs = code ? `?code=${encodeURIComponent(code)}` : '';
  return apiFetch(`/api/hremployees${qs}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Single employee (full record for edit mode)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch full employee record by HrEmployeeID.
 * Returns HrEmployeeResponse (includes sub-tables: wives, children, surgeries, etc.)
 * @param {number|string} id
 */
export async function fetchHrEmployeeById(id) {
  return apiFetch(`/api/hremployees/${id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Next code generation
// ─────────────────────────────────────────────────────────────────────────────

/** Generate the next auto-incremented employee code (e.g. "0042") */
export async function fetchNextEmpCode() {
  const data = await apiFetch('/api/hremployees/nextcode');
  return data?.nextCode || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Save / Update employee
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save or update an employee.
 * @param {object} payload - HrEmployeeRequest shape
 *   - hrEmployeeID: 0 → insert, >0 → update
 *   - All personal, employment, address, medical, guarantor fields
 *   - Optional: wives[], children[], surgeries[], civilExperiences[], uniformExperiences[]
 * @returns {{ message, hrEmployeeId, empCode }}
 */
export async function saveHrEmployee(payload) {
  const isUpdate = payload && Number(payload.hrEmployeeID) > 0;
  const path = isUpdate ? `/api/hremployees/${payload.hrEmployeeID}` : '/api/hremployees';
  const method = isUpdate ? 'PUT' : 'POST';
  return apiFetch(path, {
    method,
    body: JSON.stringify(payload),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown helpers — all served by GET /api/dropdowns?type=<name>
// Returns [{ value, text }]
// ─────────────────────────────────────────────────────────────────────────────

const DROPDOWN_CACHE = {};

async function fetchDropdown(type, params = '') {
  const key = `${type}${params}`;
  if (DROPDOWN_CACHE[key]) return DROPDOWN_CACHE[key];
  const data = await apiFetch(`/api/Dropdowns?type=${encodeURIComponent(type)}${params}`);
  DROPDOWN_CACHE[key] = data;
  return data;
}

export const hrDropdowns = {
  cast: () => fetchDropdown('cast'),
  city: () => fetchDropdown('city'),
  town: (cityId) => fetchDropdown('town', `&cityId=${cityId}`),
  policeStation: (townId) => fetchDropdown('policestation', `&townId=${townId}`),
  province: () => fetchDropdown('province'),
  education: () => fetchDropdown('education'),
  sportsLevel: () => fetchDropdown('sports-level'),
  appearance: () => fetchDropdown('appearance'),
  fitness: () => fetchDropdown('fitness'),
  bearing: () => fetchDropdown('Bearing'),
  heightFt: () => fetchDropdown('HeightFt'),
  heightInch: () => fetchDropdown('HeightInch'),
  chest: () => fetchDropdown('Chest'),
  weight: () => fetchDropdown('Weight'),
  color: () => fetchDropdown('Color'),
  bloodGroup: () => fetchDropdown('BloodGroup'),
  eyeSight: () => fetchDropdown('EyeSight'),
  criticalDiagnose: () => fetchDropdown('CriticalDiagnose'),
  medicalScreen: () => fetchDropdown('MedicalScreen'),
  habit: () => fetchDropdown('Habit'),
  expUniform: () => fetchDropdown('Organization'),
  verification: () => fetchDropdown('VerificationStatus'),
  employeeLocation: () => fetchDropdown('employee-location'),
  fslStation: () => fetchDropdown('stations'),
  residenceStatus: () => fetchDropdown('residence-status'),
};

// ─────────────────────────────────────────────────────────────────────────────
// Date formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a JS Date / ISO string → "dd/MM/yyyy" expected by the API.
 */
export function formatDateForApi(date) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Parse "dd/MM/yyyy" string from API → JS Date (for date pickers).
 */
export function parseDateFromApi(str) {
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// React hook — useHrEmployeeApi
// Wraps everything with the project's useAuthFetch (handles token refresh)
// ─────────────────────────────────────────────────────────────────────────────

export function useHrEmployeeApi() {
  const authFetch = useAuthFetch();

  const getEmployees = useCallback(async (code = '') => {
    const qs = code ? `?code=${encodeURIComponent(code)}` : '';
    const res = await authFetch(`${APP_API}/api/employee`);
    return res.json();
  }, [authFetch]);

  const getEmployeeById = useCallback(async (id) => {
    const res = await authFetch(`${APP_API}/api/employee/${id}`);
    return res.json();
  }, [authFetch]);

  const getNextCode = useCallback(async () => {
    const res = await authFetch(`${APP_API}/api/hremployees/nextcode`);
    const data = await res.json();
    return data?.nextCode || '';
  }, [authFetch]);

  const saveEmployee = useCallback(async (payload) => {
    const isUpdate = payload && Number(payload.hrEmployeeID) > 0;
    const path = isUpdate ? `${APP_API}/api/hremployees/${payload.hrEmployeeID}` : `${APP_API}/api/hremployees`;
    const method = isUpdate ? 'PUT' : 'POST';

    const res = await authFetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res;
  }, [authFetch]);

  const toggleStatus = useCallback(async (id, isActive, reason = null, authPerson = null) => {
    const res = await authFetch(`${APP_API}/api/Employee/ToggleStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive, reason, authPerson })
    });
    return res;
  }, [authFetch]);

  const getDashboardStats = useCallback(async () => {
    const res = await authFetch(`${APP_API}/api/Employee/GetDashboardStats`);
    const data = await res.json();
    return data;
  }, [authFetch]);

  return {
    getEmployees,
    getEmployeeById,
    saveEmployee,
    toggleStatus,
    getDashboardStats
  };
}
