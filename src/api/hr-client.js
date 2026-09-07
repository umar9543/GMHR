import { APP_API } from 'src/config-global';

// ----------------------------------------------------------------------
// Client master: the customer sites where guards are posted. Distinct from
// LOCATION (the company's own branch) - attendance is marked per client.
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

function buildQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') qs.append(k, v);
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export function getClients({ page = 1, pageSize = 25, search, groupId, status = 'active' } = {}) {
  return apiFetch(`/api/HrClient${buildQuery({ page, pageSize, search, groupId, status })}`);
}

export function getClient(id) {
  return apiFetch(`/api/HrClient/${id}`);
}

export function createClient(payload) {
  return apiFetch('/api/HrClient', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateClient(id, payload) {
  return apiFetch(`/api/HrClient/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function closeClient(id, reopen = false) {
  return apiFetch(`/api/HrClient/${id}/close${buildQuery({ reopen })}`, { method: 'POST' });
}

/**
 * Every client's contracted ranks, keyed by client. Loaded once so the
 * attendance sheet can offer the right ranks per row without a request per line.
 */
export async function getClientRankMap() {
  const rows = await apiFetch('/api/HrClient/rank-map');
  const map = new Map();
  (rows || []).forEach((r) => {
    const clientId = r.clientId ?? r.ClientId;
    const rank = (r.rank ?? r.Rank ?? '').trim();
    if (!clientId || !rank) return;
    if (!map.has(clientId)) map.set(clientId, []);
    const list = map.get(clientId);
    if (!list.includes(rank)) list.push(rank);
  });
  return map;
}

export function getClientRanks() {
  return apiFetch('/api/HrClient/ranks');
}

/**
 * Picker source for the attendance screen. Rows arrive PascalCase from the
 * untyped query, so they are normalised here.
 */
export async function getClientOptions(search = '', activeOnly = true, pageSize = 50) {
  const rows = await apiFetch(
    `/api/HrClient/dropdown${buildQuery({ search, activeOnly, pageSize })}`
  );
  return (rows || []).map((r) => ({
    clientId: r.clientId ?? r.ClientId,
    name: r.name ?? r.Name ?? '',
    groupName: r.groupName ?? r.GroupName ?? '',
    isClosed: r.isClosed ?? r.IsClosed ?? 0,
    requiredDay: r.requiredDay ?? r.RequiredDay ?? 0,
    requiredNight: r.requiredNight ?? r.RequiredNight ?? 0,
  }));
}

/**
 * Every client site, for the attendance sheet's per-guard picker.
 *
 * activeOnly is off on purpose: most sites that currently have guards posted
 * are flagged closed in the legacy data, and they still need marking.
 */
export function getAllClientOptions() {
  return getClientOptions('', false, 2000);
}
