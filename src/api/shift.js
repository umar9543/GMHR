import { APP_API } from 'src/config-global';

// ----------------------------------------------------------------------
// Shift setup. The legacy system had no shift master - SHIFT was free text
// on the attendance row - so this list is what the attendance sheet now
// picks from.
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
    let message = `HTTP ${res.status}`;
    try {
      message = (await res.json())?.message || message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return res.json();
}

/** Rows are normalised because Dapper can hand back either casing. */
function normalise(r) {
  return {
    shiftId: r.shiftId ?? r.ShiftId,
    code: r.code ?? r.Code ?? '',
    name: r.name ?? r.Name ?? '',
    startTime: r.startTime ?? r.StartTime ?? null,
    endTime: r.endTime ?? r.EndTime ?? null,
    sortOrder: r.sortOrder ?? r.SortOrder ?? 0,
    isActive: r.isActive ?? r.IsActive ?? true,
    usageCount: r.usageCount ?? r.UsageCount ?? 0,
  };
}

export async function getShifts(activeOnly = false) {
  const rows = await apiFetch(`/api/Shift?activeOnly=${activeOnly}`);
  return (rows || []).map(normalise);
}

export function createShift(payload) {
  return apiFetch('/api/Shift', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateShift(id, payload) {
  return apiFetch(`/api/Shift/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteShift(id) {
  return apiFetch(`/api/Shift/${id}`, { method: 'DELETE' });
}
