import { APP_API } from 'src/config-global';

// ----------------------------------------------------------------------
// Black Listing of Guards / Employees - api/BlackList.
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
    const text = await res.text();
    let message = text;
    try {
      message = JSON.parse(text).message || text;
    } catch {
      /* plain text */
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Every blacklisted person, newest entry first. */
export const getBlackList = () => apiFetch('/api/BlackList');

/** One entry (code, date, isLegacy) with its people. */
export const getBlackListEntry = (code) => apiFetch(`/api/BlackList/entry/${code}`);

/** The code a new entry will get. */
export const getNextBlackListCode = () => apiFetch('/api/BlackList/next-code').then((r) => r.code);

/** Is this CNIC black listed, and is it one of our employees? */
export const checkBlackListCnic = (cnic) =>
  apiFetch(`/api/BlackList/check?cnic=${encodeURIComponent(cnic || '')}`);

/** Saves an entry: { code?, date, people: [...] }. */
export const saveBlackListEntry = (entry) =>
  apiFetch('/api/BlackList', { method: 'POST', body: JSON.stringify(entry) });

export const deleteBlackListEntry = (code) =>
  apiFetch(`/api/BlackList/${code}`, { method: 'DELETE' });

export const blackListPictureUrl = (personId) => `${APP_API}/api/BlackList/person/${personId}/picture`;
