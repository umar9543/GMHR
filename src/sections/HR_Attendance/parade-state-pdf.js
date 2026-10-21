import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { loadLogo, drawReportHeader } from './report-header';
import { isExtra, groupRows, siteCellText, PARADE_COLUMNS } from './parade-state-utils';
import { drawParadeSummary, paradeSummaryRows } from './parade-state-summary';
import { isEpSite } from './parade-state-priority';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/**
 * Builds the Parade State PDF and returns a blob URL.
 *
 * Sites are listed under their group with a subtotal per group and a grand
 * total at the end, which is how the client's legacy report reads.
 */
export async function buildParadeStatePdf(records, dateStr) {
  const { groups, grandTotals, rowCount } = groupRows(records);

  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const logo = await loadLogo();
  drawReportHeader(doc, {
    logo,
    title: 'DAILY PARADE STATE',
    subtitle: `AS OF ${formatDate(dateStr)}`,
  });

  const head = [['Sno #', 'LOCATIONS', 'GROUP NAME', ...PARADE_COLUMNS.map((c) => c.label)]];

  // kind per body row, read back when styling: 'site' | 'subtotal' | 'spacer' | 'total'.
  const kinds = [];
  const body = [];
  let sno = 0;
  groups.forEach((group) => {
    group.rows.forEach((row) => {
      sno += 1;
      body.push([
        String(sno),
        row.clientName,
        group.groupName,
        ...PARADE_COLUMNS.map((c) => siteCellText(row, c.key)),
      ]);
      kinds.push('site');
    });
    body.push([
      '',
      '',
      group.groupName,
      ...PARADE_COLUMNS.map((c) => String(group.totals[c.key] ?? 0)),
    ]);
    kinds.push('subtotal');
    // A blank line after each group, so one group reads apart from the next.
    body.push(['', '', '', ...PARADE_COLUMNS.map(() => '')]);
    kinds.push('spacer');
  });
  body.push(['', 'GRAND TOTAL', '', ...PARADE_COLUMNS.map((c) => String(grandTotals[c.key] ?? 0))]);
  kinds.push('total');

  autoTable(doc, {
    head,
    body,
    startY: 36,
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 1,
      halign: 'center',
      lineColor: [80, 80, 80],
      lineWidth: 0.1,
    },
    headStyles: { fillColor: [33, 43, 54], textColor: 255, fontStyle: 'bold', fontSize: 6.5 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 62, halign: 'left' },
      2: { cellWidth: 46, halign: 'left' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const kind = kinds[data.row.index];
      if (kind === 'spacer') {
        // An empty row of the table between groups: the grid stays unbroken.
        data.cell.styles.fillColor = [255, 255, 255];
        data.cell.styles.minCellHeight = 4;
        return;
      }
      if (kind === 'total' || kind === 'subtotal') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = kind === 'total' ? [222, 226, 230] : [242, 244, 246];
      }
      // Anything still short of contracted strength is the point of the report.
      const label = head[0][data.column.index];
      const isDiff = ['DEF DAY', 'DEF N', 'SH DAY', 'SH N'].includes(label);
      if (isDiff && isExtra(data.cell.raw)) {
        // Over strength: shown, in green, rather than as a shortage.
        data.cell.styles.textColor = [17, 141, 87];
        data.cell.styles.fontStyle = 'bold';
      } else if ((label === 'SH DAY' || label === 'SH N') && Number(data.cell.raw) > 0) {
        data.cell.styles.textColor = [183, 29, 24];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 8, right: 8, bottom: 12 },
  });

  drawParadeSummary(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    rows: paradeSummaryRows({
      contract: { day: grandTotals.reqDay, night: grandTotals.reqNight },
      standard: { day: grandTotals.preDay, night: grandTotals.preNight },
      overtime: { day: grandTotals.otDay, night: grandTotals.otNight },
      // The EP clients' guards: the reserve, kept apart from guarding strength.
      // Same rule as the priority report: "EP-", "EP -" or contract code EP.
      ep: records
        .filter((r) => r.isEp || isEpSite(r))
        .reduce(
          (t, r) => ({
            day: t.day + Number(r.preDay || 0),
            night: t.night + Number(r.preNight || 0),
          }),
          { day: 0, night: 0 }
        ),
      // Site by site: a site over strength does not make up for one short.
      shortage: { day: grandTotals.shDay, night: grandTotals.shNight },
    }),
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal').setFontSize(7);
    doc.text(`${rowCount} client sites`, 8, doc.internal.pageSize.getHeight() - 6);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 8, doc.internal.pageSize.getHeight() - 6, {
      align: 'right',
    });
  }

  return doc.output('bloburl');
}

export default buildParadeStatePdf;
