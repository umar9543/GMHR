import { APP_API } from 'src/config-global';

// ----------------------------------------------------------------------
// Finance module API (database GMFIN). Same JWT header pattern as the HR
// side - the finance login stores its token in the shared UserData key.
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
      const body = await res.json();
      message = body?.message || message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return res.json();
}

function buildQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') qs.append(key, value);
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

/** Login against GMFIN's own user table. */
export async function financeLogin(username, password) {
  const res = await fetch(`${APP_API}/api/FinanceAuth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }
  if (!res.ok) throw new Error(data?.message || 'Incorrect username or password');
  return data;
}

// ---- chart of accounts ------------------------------------------------

export function getCoaChart() {
  return apiFetch('/api/FinanceCoa/chart');
}

export function getCoaHierarchy() {
  return apiFetch('/api/FinanceCoa/hierarchy');
}

export function getAccounts({ page = 1, pageSize = 25, caCode, search } = {}) {
  return apiFetch(`/api/FinanceCoa/accounts${buildQuery({ page, pageSize, caCode, search })}`);
}

export function createAccount(payload) {
  return apiFetch('/api/FinanceCoa/accounts', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateAccount(caCode, acCode, payload) {
  return apiFetch(`/api/FinanceCoa/accounts/${caCode}/${acCode}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteAccount(caCode, acCode) {
  return apiFetch(`/api/FinanceCoa/accounts/${caCode}/${acCode}`, { method: 'DELETE' });
}

export function getOpeningSummary() {
  return apiFetch('/api/FinanceCoa/opening-summary');
}

// ---- parties ----------------------------------------------------------

export function getParties({ page = 1, pageSize = 25, caCode, acCode, search } = {}) {
  return apiFetch(`/api/FinanceParty${buildQuery({ page, pageSize, caCode, acCode, search })}`);
}

export function createParty(payload) {
  return apiFetch('/api/FinanceParty', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateParty(caCode, acCode, subCode, payload) {
  return apiFetch(`/api/FinanceParty/${caCode}/${acCode}/${subCode}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteParty(caCode, acCode, subCode) {
  return apiFetch(`/api/FinanceParty/${caCode}/${acCode}/${subCode}`, { method: 'DELETE' });
}

// ---- vouchers (module 2) ---------------------------------------------

export function getJournals({ page = 1, pageSize = 25, status, search, fromDate, toDate } = {}) {
  return apiFetch(
    `/api/FinanceVoucher/journals${buildQuery({ page, pageSize, status, search, fromDate, toDate })}`
  );
}

export function getJournal(code) {
  return apiFetch(`/api/FinanceVoucher/journals/${code}`);
}

export function createJournal(payload) {
  return apiFetch('/api/FinanceVoucher/journals', { method: 'POST', body: JSON.stringify(payload) });
}

export function cancelJournal(code) {
  return apiFetch(`/api/FinanceVoucher/journals/${code}/cancel`, { method: 'POST' });
}

// ----------------------------------------------------------------------
// Payment and Receipt vouchers. Two of the six VOUCHER_TYPE values the
// client's ledger holds; both post into GENERAL_LEDGER + GL.
// `kind` is 'payment' or 'receipt'.
// ----------------------------------------------------------------------

export function getCashVouchers(
  kind,
  { page = 1, pageSize = 25, search, voucherType, status = 'Live', fromDate, toDate } = {}
) {
  const qs = new URLSearchParams({ page, pageSize, status });
  if (search) qs.append('search', search);
  if (voucherType) qs.append('voucherType', voucherType);
  if (fromDate) qs.append('fromDate', fromDate);
  if (toDate) qs.append('toDate', toDate);
  return apiFetch(`/api/finance/cash/${kind}?${qs.toString()}`);
}

export function getCashVoucherTypes(kind) {
  return apiFetch(`/api/finance/cash/${kind}/types`);
}

export function getCashVoucher(kind, voucherType, code) {
  return apiFetch(`/api/finance/cash/${kind}/${encodeURIComponent(voucherType)}/${code}`);
}

export function createCashVoucher(kind, payload) {
  return apiFetch(`/api/finance/cash/${kind}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function cancelCashVoucher(kind, voucherType, code) {
  return apiFetch(`/api/finance/cash/${kind}/${encodeURIComponent(voucherType)}/${code}/cancel`, {
    method: 'POST',
  });
}

// ----------------------------------------------------------------------
// Expense bills. A supplier's bill: books the expense and raises the
// payable. A payment voucher settles it later.
// ----------------------------------------------------------------------

export function getExpenseBills({
  page = 1,
  pageSize = 25,
  search,
  status = 'Live',
  locCode,
  fromDate,
  toDate,
} = {}) {
  const qs = new URLSearchParams({ page, pageSize, status });
  if (search) qs.append('search', search);
  if (locCode) qs.append('locCode', locCode);
  if (fromDate) qs.append('fromDate', fromDate);
  if (toDate) qs.append('toDate', toDate);
  return apiFetch(`/api/finance/expense?${qs.toString()}`);
}

export function getExpenseLocations() {
  return apiFetch('/api/finance/expense/locations');
}

export function getExpenseBill(code) {
  return apiFetch(`/api/finance/expense/${code}`);
}

export function createExpenseBill(payload) {
  return apiFetch('/api/finance/expense', { method: 'POST', body: JSON.stringify(payload) });
}

export function cancelExpenseBill(code) {
  return apiFetch(`/api/finance/expense/${code}/cancel`, { method: 'POST' });
}

// ----------------------------------------------------------------------
// Client invoicing - the revenue side. The company bills a client for the
// guards posted there, one line per rank. Opposite of the expense bill.
// ----------------------------------------------------------------------

export function getClientInvoices({
  page = 1,
  pageSize = 25,
  search,
  status = 'Live',
  province,
  fromDate,
  toDate,
} = {}) {
  const qs = new URLSearchParams({ page, pageSize, status });
  if (search) qs.append('search', search);
  if (province) qs.append('province', province);
  if (fromDate) qs.append('fromDate', fromDate);
  if (toDate) qs.append('toDate', toDate);
  return apiFetch(`/api/finance/billing?${qs.toString()}`);
}

export function getClientInvoice(invoiceNo) {
  return apiFetch(`/api/finance/billing/${invoiceNo}`);
}

/** The service catalogue - one entry per billable rank or piece of equipment. */
export function getBillingItems() {
  return apiFetch('/api/finance/billing/items');
}

/** Provinces with their sales-tax account and default rate. */
export function getBillingProvinces() {
  return apiFetch('/api/finance/billing/provinces');
}

export function createClientInvoice(payload) {
  return apiFetch('/api/finance/billing', { method: 'POST', body: JSON.stringify(payload) });
}

export function cancelClientInvoice(invoiceNo) {
  return apiFetch(`/api/finance/billing/${invoiceNo}/cancel`, { method: 'POST' });
}

// ----------------------------------------------------------------------
// Reports. All three read the same two facts - an account's opening balance
// and its GENERAL_LEDGER movement - and differ only in how they group.
// ----------------------------------------------------------------------

export function getTrialBalance({ fromDate, toDate, rptType, includeZero = false } = {}) {
  const qs = new URLSearchParams();
  if (fromDate) qs.append('fromDate', fromDate);
  if (toDate) qs.append('toDate', toDate);
  if (rptType) qs.append('rptType', rptType);
  if (includeZero) qs.append('includeZero', 'true');
  return apiFetch(`/api/finance/reports/trial-balance?${qs.toString()}`);
}

export function getAccountLedger({ caCode, acCode, subCode, fromDate, toDate }) {
  const qs = new URLSearchParams({ caCode: String(caCode), acCode: String(acCode) });
  if (subCode) qs.append('subCode', String(subCode));
  if (fromDate) qs.append('fromDate', fromDate);
  if (toDate) qs.append('toDate', toDate);
  return apiFetch(`/api/finance/reports/ledger?${qs.toString()}`);
}

export function getBalanceSheet({ asAtDate, fromDate } = {}) {
  const qs = new URLSearchParams();
  if (asAtDate) qs.append('asAtDate', asAtDate);
  if (fromDate) qs.append('fromDate', fromDate);
  return apiFetch(`/api/finance/reports/balance-sheet?${qs.toString()}`);
}

/** Every cash and bank account with its balance - the cash position. */
export function getBankAccounts({ asAtDate } = {}) {
  const qs = new URLSearchParams();
  if (asAtDate) qs.append('asAtDate', asAtDate);
  return apiFetch(`/api/finance/reports/bank-book/accounts?${qs.toString()}`);
}

/** One bank's book: opening, movements with cheque numbers, running balance. */
export function getBankBook({ caCode, acCode, fromDate, toDate }) {
  const qs = new URLSearchParams({ caCode: String(caCode), acCode: String(acCode) });
  if (fromDate) qs.append('fromDate', fromDate);
  if (toDate) qs.append('toDate', toDate);
  return apiFetch(`/api/finance/reports/bank-book?${qs.toString()}`);
}

// ----------------------------------------------------------------------
// Receivables aging. Buckets are calendar months - the current month, the
// three before it, then everything older - matching the legacy
// PROC_AGING_WO_PDC rather than 30/60/90 day windows.
// ----------------------------------------------------------------------

export function getAging({ asAtDate, side = 'receivable', caCode, acCode } = {}) {
  const qs = new URLSearchParams({ side });
  if (asAtDate) qs.append('asAtDate', asAtDate);
  if (caCode) qs.append('caCode', String(caCode));
  if (acCode) qs.append('acCode', String(acCode));
  return apiFetch(`/api/finance/reports/aging?${qs.toString()}`);
}

/** The invoice-by-invoice detail behind the aging. */
export function getOutstanding({ asAtDate, side = 'receivable', caCode, acCode, subCode } = {}) {
  const qs = new URLSearchParams({ side });
  if (asAtDate) qs.append('asAtDate', asAtDate);
  if (caCode) qs.append('caCode', String(caCode));
  if (acCode) qs.append('acCode', String(acCode));
  if (subCode) qs.append('subCode', String(subCode));
  return apiFetch(`/api/finance/reports/outstanding?${qs.toString()}`);
}

/**
 * The open documents a party still owes on, for allocating a receipt or
 * payment against them. Reuses the outstanding report, scoped to one party.
 *
 * kind 'receipt' -> the customer's unpaid invoices
 * kind 'payment' -> the supplier's unpaid bills
 */
export async function getOpenDocuments(kind, { caCode, acCode, subCode, asAtDate } = {}) {
  const res = await getOutstanding({
    side: kind === 'payment' ? 'payable' : 'receivable',
    caCode,
    acCode,
    subCode,
    asAtDate,
  });
  return (res.records || []).map((r) => ({
    voucherType: r.voucherType,
    voucherCode: r.voucherCode,
    voucherDate: r.voucherDate,
    amount: r.amount,
    paid: r.paid,
    outstanding: r.outstanding,
    daysOld: r.daysOld,
  }));
}
