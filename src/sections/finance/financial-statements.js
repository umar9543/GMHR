// ----------------------------------------------------------------------
// Balance sheet, profit and loss and schedule of notes, shaped as the legacy
// system prints them, from api/finance/statements/financial.
//
// Every line there is one sub-group's balance (debit positive). The screens
// and the PDFs both read the structures built here, so they always agree.
//
// Signs, as legacy prints them:
//   assets               the balance as it stands (a credit shows in brackets)
//   equity, liabilities  the balance turned round, so a credit is positive
//   profit and loss      turned round: income positive, expense in brackets
// ----------------------------------------------------------------------

const ASSET_GROUPS = ['FA', 'CA'];

const isAsset = (l) => ASSET_GROUPS.includes(String(l.rptGroup || '').trim());

const shown = (l) => (l.rptType === 'BS' && isAsset(l) ? l.balance : -l.balance);

/** Main group -> group -> sub-group, in note order, with the shown amounts. */
function tree(lines, rptType) {
  const mains = new Map();
  lines
    .filter((l) => l.rptType === rptType)
    .forEach((l) => {
      if (!mains.has(l.mainGroupCode)) {
        mains.set(l.mainGroupCode, {
          code: l.mainGroupCode,
          name: l.mainGroupName,
          note: Number(l.noteNo),
          rptGroup: String(l.rptGroup || '').trim(),
          asset: isAsset(l),
          total: 0,
          groups: new Map(),
        });
      }
      const m = mains.get(l.mainGroupCode);
      if (!m.groups.has(l.groupCode)) {
        m.groups.set(l.groupCode, { code: l.groupCode, name: l.groupName, total: 0, subs: [] });
      }
      const g = m.groups.get(l.groupCode);
      const amount = shown(l);
      g.subs.push({ code: l.subGroupCode, name: l.subGroupName, amount });
      g.total += amount;
      m.total += amount;
    });
  return [...mains.values()]
    .map((m) => ({ ...m, groups: [...m.groups.values()].sort((a, b) => a.code - b.code) }))
    .sort((a, b) => a.note - b.note || a.code - b.code);
}

/**
 * The balance sheet: the asset sections and their total, then equity and
 * liabilities - each section followed by the running total legacy prints,
 * with the year's profit carried in as RETAINED PROFIT after equity.
 */
export function balanceSheet(data) {
  const mains = tree(data.lines || [], 'BS');
  const assets = mains.filter((m) => m.asset);
  const others = mains.filter((m) => !m.asset);
  const equityNote = others.find((m) => m.rptGroup === 'OE')?.note ?? 4;

  const totalAssets = assets.reduce((t, m) => t + m.total, 0);

  // Equity first, then the profit, then the liabilities - each followed by the
  // running total of everything above it.
  const sides = [];
  let running = 0;
  const equity = others.filter((m) => m.rptGroup === 'OE');
  const liabilities = others.filter((m) => m.rptGroup !== 'OE');
  equity.forEach((m) => {
    running += m.total;
    sides.push({ ...m, running });
  });
  running += data.profit;
  sides.push({
    code: 'profit',
    name: 'EQUITY AND LIABILITES',
    note: equityNote,
    groups: [{ code: 6, name: 'RETAINED PROFIT', total: data.profit, subs: [] }],
    total: data.profit,
    running,
    isProfit: true,
  });
  liabilities.forEach((m) => {
    running += m.total;
    sides.push({ ...m, running });
  });

  return { assets, totalAssets, sides, totalLiabilities: running };
}

/** Profit and loss: income, cost of sales, gross profit, expenses, other income, result. */
export function profitAndLoss(data) {
  const mains = tree(data.lines || [], 'PL');
  const rows = [];
  let gross = 0;
  mains.forEach((m) => {
    // Legacy prints no heading over the sales line.
    if (m.rptGroup !== 'SA') rows.push({ kind: 'heading', label: m.name });
    m.groups.forEach((g) =>
      rows.push({ kind: 'line', label: g.name, note: m.note, amount: g.total })
    );
    if (m.rptGroup === 'SA' || m.rptGroup === 'CS') gross += m.total;
    if (m.rptGroup === 'CS') rows.push({ kind: 'gross', label: 'GROSS PROFIT', amount: gross });
  });
  return { rows, gross, profit: data.profit };
}

/** The schedule of notes: per main group, each group's sub-groups and its total. */
export function scheduleOfNotes(data) {
  const blocks = [];
  ['BS', 'PL'].forEach((type) => {
    const mains = tree(data.lines || [], type);
    mains.forEach((m) => {
      blocks.push({ note: m.note, name: m.name, groups: m.groups });
      if (type === 'BS' && m.rptGroup === 'OE' && !blocks.some((b) => b.isProfit)) {
        blocks.push({
          note: m.note,
          name: 'EQUITY AND LIABILITES',
          isProfit: true,
          profit: data.profit,
        });
      }
    });
  });
  return blocks;
}

/** 1 -> '1.00', as legacy prints group and note codes. */
export const code2 = (n) => Number(n || 0).toFixed(2);

/** Whole rupees with separators; a negative amount in brackets. */
export const amt = (v) => {
  const n = Math.round(Number(v || 0));
  const s = Math.abs(n).toLocaleString('en-US');
  return n < 0 ? `(${s})` : s;
};
