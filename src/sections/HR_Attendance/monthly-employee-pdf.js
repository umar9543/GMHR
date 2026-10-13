// eslint-disable-next-line new-cap -- jsPDF is the library's own exported name
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { loadLogo, drawReportHeader } from './report-header';

// ----------------------------------------------------------------------
// The Monthly Report by Employee: one guard's month, a line per day he was
// marked, in the Daily Report by Employee's own layout - the same masthead,
// a heading line naming him, the same columns with the date in front, and
// his totals under the table.
// ----------------------------------------------------------------------

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

/** "P 20   A 2   L 1   P/P 3", the marks he has, in a fixed order. */
export function markTotals(rows) {
  const order = ['P', 'P/P', 'A', 'L', 'G', 'WO', 'OT'];
  const counts = new Map();
  rows.forEach((r) => counts.set(r.attendance, (counts.get(r.attendance) || 0) + 1));
  return order.filter((m) => counts.has(m)).map((m) => ({ mark: m, count: counts.get(m) }));
}

/**
 * @param report  { employee: { id, name }, year, month, rows: [{ date, shift,
 *                attendance, location, category, otLocation, ovCategory }] }
 * @returns a blob URL
 */
export async function buildMonthlyEmployeePdf({ employee, year, month, rows }) {
  // eslint-disable-next-line new-cap -- jsPDF is the library's own exported name
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;

  const logo = await loadLogo();
  const period = `${MONTHS[month - 1]} ${year}`;

  const afterHeader = drawReportHeader(doc, {
    logo,
    title: 'MONTHLY REPORT BY EMPLOYEE',
    subtitle: `FOR ${period}`,
  });

  // The guard's own line, where the daily report names the site.
  doc.setFont('helvetica', 'bold').setFontSize(10);
  doc.text('Employee', margin, afterHeader + 4);
  doc.text(String(employee.name || '').toUpperCase(), margin + 20, afterHeader + 4);
  doc.setFont('helvetica', 'normal').setFontSize(9);
  doc.text(`Code :  ${employee.id}`, pageWidth - margin, afterHeader + 4, { align: 'right' });

  autoTable(doc, {
    head: [['DATE', 'SHIFT', 'ATTND', 'Location', 'Category', 'Over Time Location', 'OV Category']],
    body: rows.map((r) => [
      r.date,
      r.shift,
      r.attendance,
      r.location,
      r.category,
      r.otLocation,
      r.ovCategory,
    ]),
    startY: afterHeader + 8,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1, lineColor: [60, 60, 60], lineWidth: 0.1 },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 13, halign: 'center' },
      3: { cellWidth: 50 },
      4: { cellWidth: 27 },
      5: { cellWidth: 40 },
      6: { cellWidth: 28 },
    },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 2) return;
      const mark = String(data.cell.raw || '');
      if (mark === 'A') data.cell.styles.textColor = [183, 29, 24];
      if (mark === 'L') data.cell.styles.textColor = [183, 110, 0];
    },
    margin: { left: margin, right: margin, bottom: 14 },
  });

  let y = doc.lastAutoTable.finalY + 6;
  if (y > doc.internal.pageSize.getHeight() - 16) {
    doc.addPage();
    y = 16;
  }
  doc.setFont('helvetica', 'bold').setFontSize(8.5);
  const totals = markTotals(rows);
  doc.text(
    rows.length
      ? `${totals.map((t) => `${t.mark} ${t.count}`).join('     ')}          ${rows.length} day(s) marked`
      : 'No attendance was marked this month',
    margin,
    y
  );

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal').setFontSize(7);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 6, {
      align: 'right',
    });
  }

  return doc.output('bloburl');
}

export default buildMonthlyEmployeePdf;
