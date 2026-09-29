import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { loadLogo, drawReportHeader } from './report-header';
import { groupRows, PARADE_COLUMNS } from './parade-state-utils';
import { drawParadeSummary, paradeSummaryRows } from './parade-state-summary';

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

  const body = [];
  let sno = 0;
  groups.forEach((group) => {
    group.rows.forEach((row) => {
      sno += 1;
      body.push([
        String(sno),
        row.clientName,
        group.groupName,
        ...PARADE_COLUMNS.map((c) => String(row[c.key] ?? 0)),
      ]);
    });
    body.push([
      '',
      '',
      group.groupName,
      ...PARADE_COLUMNS.map((c) => String(group.totals[c.key] ?? 0)),
    ]);
  });
  body.push([
    '',
    'GRAND TOTAL',
    '',
    ...PARADE_COLUMNS.map((c) => String(grandTotals[c.key] ?? 0)),
  ]);

  const subtotalRows = new Set();
  let cursor = 0;
  groups.forEach((group) => {
    cursor += group.rows.length;
    subtotalRows.add(cursor);
    cursor += 1;
  });
  const grandTotalRow = body.length - 1;

  autoTable(doc, {
    head,
    body,
    startY: 36,
    theme: 'grid',
    styles: { fontSize: 6.5, cellPadding: 1, halign: 'center', lineColor: [80, 80, 80], lineWidth: 0.1 },
    headStyles: { fillColor: [33, 43, 54], textColor: 255, fontStyle: 'bold', fontSize: 6.5 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 62, halign: 'left' },
      2: { cellWidth: 46, halign: 'left' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      if (data.row.index === grandTotalRow || subtotalRows.has(data.row.index)) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = data.row.index === grandTotalRow ? [222, 226, 230] : [242, 244, 246];
      }
      // Anything still short of contracted strength is the point of the report.
      const label = head[0][data.column.index];
      if ((label === 'SH DAY' || label === 'SH N') && Number(data.cell.raw) > 0) {
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
    }),
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal').setFontSize(7);
    doc.text(
      `${rowCount} client sites`,
      8,
      doc.internal.pageSize.getHeight() - 6
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 8,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'right' }
    );
  }

  return doc.output('bloburl');
}

export default buildParadeStatePdf;
