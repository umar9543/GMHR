// ---------------------------------------------------------------------------
// Parade State maths, shared by the on-screen table and the PDF so the two can
// never disagree.
//
//   DEF  deficiency  = contracted strength not on post          (REQ - PRE)
//   SH   short       = what is still uncovered after overtime   (REQ - PRE - OT)
//
// Both are floored at zero: a site running over strength reads 0, not a
// negative. OT is counted as cover, which is why SH is never worse than DEF.
// ---------------------------------------------------------------------------

const atLeastZero = (n) => (n > 0 ? n : 0);

export function withDerived(row) {
  return {
    ...row,
    defDay: atLeastZero(row.reqDay - row.preDay),
    defNight: atLeastZero(row.reqNight - row.preNight),
    shDay: atLeastZero(row.reqDay - row.preDay - row.otDay),
    shNight: atLeastZero(row.reqNight - row.preNight - row.otNight),
  };
}

const SUMMED = [
  'reqTotal',
  'reqDay',
  'preDay',
  'defDay',
  'otDay',
  'shDay',
  'reqNight',
  'preNight',
  'defNight',
  'otNight',
  'shNight',
];

export function totalsOf(rows) {
  return SUMMED.reduce((acc, key) => {
    acc[key] = rows.reduce((sum, r) => sum + (r[key] || 0), 0);
    return acc;
  }, {});
}

/**
 * Rows arrive already ordered by group then client, so grouping is a single
 * pass. Each group carries its own subtotal, the way the legacy report prints.
 */
export function groupRows(records) {
  const withMaths = records.map(withDerived);
  const groups = [];
  const index = new Map();

  withMaths.forEach((row) => {
    const name = row.groupName || '(no group)';
    if (!index.has(name)) {
      index.set(name, { groupName: name, rows: [] });
      groups.push(index.get(name));
    }
    index.get(name).rows.push(row);
  });

  groups.forEach((g) => {
    g.totals = totalsOf(g.rows);
  });

  return { groups, grandTotals: totalsOf(withMaths), rowCount: withMaths.length };
}

export const PARADE_COLUMNS = [
  { key: 'reqTotal', label: 'REQ GD' },
  { key: 'reqDay', label: 'REQ DAY' },
  { key: 'preDay', label: 'PRE DAY' },
  { key: 'defDay', label: 'DEF DAY' },
  { key: 'otDay', label: 'OT DAY' },
  { key: 'shDay', label: 'SH DAY' },
  { key: 'reqNight', label: 'REQ N' },
  { key: 'preNight', label: 'PRE N' },
  { key: 'defNight', label: 'DEF N' },
  { key: 'otNight', label: 'OT N' },
  { key: 'shNight', label: 'SH N' },
];
