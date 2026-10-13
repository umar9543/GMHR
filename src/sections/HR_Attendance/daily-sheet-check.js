// ----------------------------------------------------------------------
// The daily sheet check: what each client asked for, category by category,
// against what the sheet on screen has marked there.
//
// A guard's row puts him at his client under his category. A guard marked
// P/P worked both shifts: the overtime is the other shift, at his OT client
// (his own when none is named) under his OT category - as the legacy parade
// state counts it, so one P/P guard holds a site of 1 day + 1 night. Only P
// and P/P are on post; A and L are counted apart, so a short client shows why.
//
// The sheet is checked as it stands, saved or not, so a mistake is caught
// before it is saved.
// ----------------------------------------------------------------------

export const CHECK_STATUS = {
  ok: { label: 'OK', color: 'success' },
  notInContract: { label: 'Not asked for', color: 'error' },
  noCategory: { label: 'No category', color: 'error' },
  short: { label: 'Short', color: 'error' },
  extra: { label: 'Extra', color: 'warning' },
  shift: { label: 'Day/Night differs', color: 'warning' },
};

const NO_CATEGORY = '(no category)';

const keyOf = (category) => String(category || '').trim().toLowerCase();

/**
 * @param details   the sheet's rows
 * @param options   requirementsByClient: Map<clientId, [{ rank, requiredDay, requiredNight }]>
 *                  clientById: Map<clientId, { name }>
 *                  markOf(row) -> 'P' | 'A' | 'L' | 'P/P' | ...
 *                  shiftOf(row) -> 'D' | 'N'
 */
export function checkDailySheet(details, { requirementsByClient, clientById, markOf, shiftOf }) {
  // ------------------------------------------------- every duty on the sheet
  const duties = [];
  (details || []).forEach((row) => {
    const mark = markOf(row);
    const category = String(row.rank || '').trim();
    if (row.clientId) {
      duties.push({
        row,
        clientId: row.clientId,
        category,
        mark,
        kind: 'Regular',
        shift: shiftOf(row),
        onPost: mark === 'P' || mark === 'P/P',
      });
    }
    if (mark === 'P/P' && row.clientId) {
      duties.push({
        row,
        clientId: row.otClientId || row.clientId,
        category: String(row.ovRank || '').trim() || category,
        mark,
        kind: 'Overtime',
        shift: shiftOf(row) === 'N' ? 'D' : 'N',
        onPost: true,
      });
    }
  });

  // ------------------------------------------------------ client by client
  const byClient = new Map();
  duties.forEach((duty) => {
    if (!byClient.has(duty.clientId)) byClient.set(duty.clientId, []);
    byClient.get(duty.clientId).push(duty);
  });

  const wrongCategory = [];
  const clients = [];

  byClient.forEach((clientDuties, clientId) => {
    const requirements = requirementsByClient.get(clientId) || [];
    const hasSetup = requirements.length > 0;
    // A client whose categories all ask for nobody - the company's own office
    // is one - has no strength to count against; only categories are checked.
    const hasStrength = requirements.some(
      (r) => r.requiredDay === null || r.requiredDay + (r.requiredNight || 0) > 0
    );
    // What the client asks for, as shown beside a guard in the wrong category.
    const asked = requirements.filter(
      (r) => r.requiredDay === null || r.requiredDay + (r.requiredNight || 0) > 0
    );
    const contracted = (asked.length ? asked : requirements).map((r) =>
      r.requiredDay === null ? r.rank : `${r.rank} (${r.requiredDay} day, ${r.requiredNight} night)`
    );
    const lines = new Map();

    const lineFor = (category) => {
      const key = category ? keyOf(category) : NO_CATEGORY;
      if (!lines.has(key)) {
        lines.set(key, {
          category: category || NO_CATEGORY,
          inContract: false,
          reqDay: null,
          reqNight: null,
          markedDay: 0,
          markedNight: 0,
          ot: 0,
          otDay: 0,
          otNight: 0,
          offPost: 0,
          guards: [],
        });
      }
      return lines.get(key);
    };

    requirements.forEach((r) => {
      const line = lineFor(r.rank);
      line.inContract = true;
      if (r.requiredDay === null || r.requiredNight === null) {
        // An API without the counts: the category can still be checked.
        line.asked = true;
        return;
      }
      line.reqDay = (line.reqDay || 0) + r.requiredDay;
      line.reqNight = (line.reqNight || 0) + r.requiredNight;
      // A category with nothing asked for - equipment such as a walky talky,
      // or a rank since dropped - is only shown if somebody is marked under it.
      if (r.requiredDay + r.requiredNight > 0) line.asked = true;
    });

    clientDuties.forEach((duty) => {
      const line = lineFor(duty.category);
      line.guards.push(duty);
      if (!duty.onPost) line.offPost += 1;
      else if (duty.kind === 'Overtime') {
        line.ot += 1;
        if (duty.shift === 'N') line.otNight += 1;
        else line.otDay += 1;
      } else if (duty.shift === 'N') line.markedNight += 1;
      else line.markedDay += 1;

      const wrong = !duty.category || (hasSetup && !line.inContract);
      if (wrong) {
        wrongCategory.push({
          empId: duty.row.empId,
          employeeName: duty.row.employeeName || `Employee ${duty.row.empId}`,
          clientId,
          clientName: clientById.get(clientId)?.name || `Client ${clientId}`,
          category: duty.category || NO_CATEGORY,
          mark: duty.mark,
          kind: duty.kind,
          contracted,
        });
      }
    });

    const finished = Array.from(lines.values())
      .filter((line) => line.asked || line.guards.length)
      .map((line) => {
        const onDuty = line.markedDay + line.markedNight + line.ot;
        const known = hasStrength && line.reqDay !== null && line.reqNight !== null;
        const reqTotal = known ? line.reqDay + line.reqNight : null;
        const diff = known ? onDuty - reqTotal : null;

        // Short by shift, as the parade state's SH column: the day asked for
        // against day guards plus overtime covering the day, and the same by
        // night. Enough in total but in the wrong shift is still short.
        const shortShift =
          known &&
          (line.markedDay + line.otDay < line.reqDay || line.markedNight + line.otNight < line.reqNight);

        let status = 'ok';
        if (line.category === NO_CATEGORY) status = 'noCategory';
        else if (hasSetup && !line.inContract) status = 'notInContract';
        else if (!hasSetup) status = 'ok';
        else if (shortShift) status = 'short';
        else if (diff !== null && diff > 0) status = 'extra';
        return { ...line, onDuty, reqTotal, diff, status };
      })
      // What was asked for first, then the rest, each alphabetically.
      .sort((a, b) => Number(b.inContract) - Number(a.inContract) || a.category.localeCompare(b.category));

    clients.push({
      clientId,
      name: clientById.get(clientId)?.name || `Client ${clientId}`,
      hasSetup,
      hasStrength,
      lines: finished,
      issues: finished.filter((line) => line.status !== 'ok').length,
    });
  });

  clients.sort((a, b) => b.issues - a.issues || a.clientId - b.clientId);

  const allLines = clients.flatMap((c) => c.lines);
  return {
    clients,
    wrongCategory,
    wrongIds: new Set(wrongCategory.map((w) => w.empId)),
    totals: {
      clients: clients.length,
      clientsWithIssues: clients.filter((c) => c.issues > 0).length,
      wrongCategory: wrongCategory.length,
      short: allLines.filter((l) => l.status === 'short').length,
      extra: allLines.filter((l) => l.status === 'extra').length,
      noSetup: clients.filter((c) => !c.hasSetup).length,
      countsKnown: allLines.every((l) => !l.inContract || l.reqDay !== null),
    },
  };
}
