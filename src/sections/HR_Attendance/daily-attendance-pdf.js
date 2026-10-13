import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ----------------------------------------------------------------------
// The legacy daily attendance list: the guards the attendance filter has
// picked (Absent, Present, Leave...), by shift - day first, then night - each
// shift closed by its count, and the number of guards at the end.
//
// Titled by the mark filtered on, as the legacy report is, or by the quick
// report it was asked for (Shortage, Transfer...). Its last column is the
// overtime location unless the report names another - the previous client
// for a transfer, the old shift for a shift change.
// ----------------------------------------------------------------------

const COMPANY = 'GUARDS MARK SECURITY SERVICES (PVT) LTD.';

export const MARK_TITLES = {
  P: 'Present',
  A: 'Absent',
  L: 'Leave',
  'P/P': 'Present + Overtime',
  G: 'Gazetted',
  WO: 'Week Off',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const NAVY = [0, 0, 139];
const BLUE = [0, 0, 255];
const CYAN = [0, 255, 255];
const GREEN = [0, 255, 0];

const SHIFTS = [
  { code: 'D', label: 'D' },
  { code: 'N', label: 'N' },
];

/**
 * @param rows  [{ shift: 'D'|'N', mark, empId, employeeName, location, otLocation, last? }]
 * @param options  { dateStr: 'yyyy-mm-dd', mark: the filtered mark or '',
 *                   title?: overrides the mark's title,
 *                   lastHeader?: the last column's header; rows then fill it from `last` }
 * @returns a blob URL
 */
export function buildDailyAttendancePdf(rows, { dateStr, mark, title: asked, lastHeader }) {
  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  const [year, month, day] = String(dateStr).split('-').map(Number);
  const title = asked || MARK_TITLES[mark] || 'Daily Attendance';

  // ------------------------------------------------------------ masthead
  doc.setFont('times', 'normal').setFontSize(15).setTextColor(...NAVY);
  doc.text(COMPANY, pageWidth / 2, 13, { align: 'center' });

  doc.setFont('times', 'bold').setFontSize(15).setTextColor(...BLUE);
  doc.text(title, pageWidth / 2, 20, { align: 'center' });

  const labelX = pageWidth - 52;
  doc.setTextColor(0, 0, 0);
  doc.setFont('times', 'normal').setFontSize(9);
  doc.text('Month of :', labelX, 20.5, { align: 'right' });
  doc.text('Date :', labelX + 6, 26, { align: 'right' });
  doc.setFont('times', 'bold').setFontSize(11);
  doc.text(MONTHS[(month || 1) - 1], labelX + 3, 21);
  doc.setFontSize(9);
  doc.text(
    `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
    labelX + 9,
    26
  );

  // ---------------------------------------------------------------- body
  // kind per body row, read back when styling: 'band' | 'guard' | 'count'.
  const kinds = [];
  const body = [];

  const byCode = (a, b) => Number(a.empId) - Number(b.empId);
  SHIFTS.forEach((shift) => {
    const guards = rows.filter((r) => (r.shift === 'N' ? 'N' : 'D') === shift.code).sort(byCode);
    if (!guards.length) return;

    body.push([{ content: shift.label, colSpan: 6 }]);
    kinds.push('band');

    guards.forEach((g) => {
      const last = lastHeader ? g.last : g.otLocation;
      body.push([shift.code, g.mark, g.location || '-', String(g.empId), g.employeeName, last || '']);
      kinds.push('guard');
    });

    body.push(['', String(guards.length), '', '', '', '']);
    kinds.push('count');
  });

  autoTable(doc, {
    startY: 28,
    head: [['SHIFT', 'ATTEND', 'LOCATION', 'COMPANY\nCODE', 'EMPLOYEE NAME', lastHeader || 'OVER TIME LOCATION']],
    body,
    theme: 'plain',
    margin: { left: margin, right: margin, top: 12, bottom: 16 },
    styles: {
      font: 'times',
      fontSize: 8,
      cellPadding: { top: 1.1, bottom: 1.1, left: 1.5, right: 1.5 },
      textColor: [0, 0, 0],
      valign: 'middle',
    },
    headStyles: {
      fillColor: CYAN,
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      minCellHeight: 10,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 46, overflow: 'ellipsize' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 52, overflow: 'ellipsize' },
      5: { cellWidth: 'auto', overflow: 'ellipsize' },
    },
    didParseCell: (data) => {
      if (data.section === 'head') {
        // Location and employee name sit left, over their text; the rest centre.
        data.cell.styles.halign = [2, 4].includes(data.column.index) ? 'left' : 'center';
        if (data.column.index === 3) data.cell.styles.fontSize = 6.5;
        // One box round the whole header, no lines between its columns.
        data.cell.styles.lineWidth = {
          top: 0.3,
          bottom: 0.3,
          left: data.column.index === 0 ? 0.3 : 0,
          right: data.column.index === 5 ? 0.3 : 0,
        };
        return;
      }
      const kind = kinds[data.row.index];
      if (kind === 'band') {
        data.cell.styles.halign = 'left';
        data.cell.styles.fillColor = GREEN;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.lineColor = [0, 0, 0];
        data.cell.styles.lineWidth = 0.3;
      } else if (kind === 'count') {
        data.cell.styles.fontStyle = 'bold';
      } else if (kind === 'guard') {
        // A rule under each guard, as the legacy list has.
        data.cell.styles.lineColor = [0, 0, 0];
        data.cell.styles.lineWidth = { bottom: 0.3, top: 0, left: 0, right: 0 };
      }
    },
  });

  // --------------------------------------------------------------- total
  let y = doc.lastAutoTable.finalY + 8;
  if (y > pageHeight - 20) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('times', 'bold').setFontSize(9);
  doc.text('TOTAL NO. OF GUARDS ALLOTED', margin + 14, y);
  doc.text(String(rows.length), margin + 76, y);

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('times', 'normal').setFontSize(9).setTextColor(0, 0, 0);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  return doc.output('bloburl');
}

export default buildDailyAttendancePdf;
