// eslint-disable-next-line new-cap -- jsPDF is the library's own exported name
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { loadLogo, drawReportHeader } from './report-header';

// ----------------------------------------------------------------------
// The Daily Report by Employee, laid out as the legacy one prints it: a block
// per site, headed by its name and the date, and inside it the guards under
// their shift letter.
// ----------------------------------------------------------------------

const dmy = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** LASTNAME is '-' for most of the legacy rows, which prints as a dangling dash. */
const cleanName = (name) => String(name || '').replace(/\s*-\s*$/, '').trim();

/**
 * Guards grouped by the site they stood at, then by shift - the order the
 * legacy report reads in, and the order the screen shows.
 */
export function groupByClient(records) {
  const sites = new Map();

  records.forEach((row) => {
    const key = row.clientId ?? 0;
    if (!sites.has(key)) {
      sites.set(key, {
        clientId: row.clientId,
        clientName: row.clientName || `Client ${row.clientId ?? '-'}`,
        groupName: row.groupName || '',
        shifts: new Map(),
      });
    }
    const site = sites.get(key);
    const shift = row.shift || 'D';
    if (!site.shifts.has(shift)) site.shifts.set(shift, []);
    site.shifts.get(shift).push(row);
  });

  return Array.from(sites.values())
    .sort((a, b) => a.clientName.localeCompare(b.clientName))
    .map((site) => ({
      ...site,
      shifts: Array.from(site.shifts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([shift, rows]) => ({
          shift,
          rows: rows.sort((a, b) => a.empId - b.empId),
        })),
    }));
}

/** Builds the report and returns a blob URL for the preview and the download. */
export async function buildDailyEmployeePdf(records, dateStr) {
  const sites = groupByClient(records);

  // eslint-disable-next-line new-cap -- jsPDF is the library's own exported name
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;

  const logo = await loadLogo();
  const head = [['SHIFT', 'ATTND', 'Company\nEmployee Code', 'Employee', 'Category', 'Over Time Location', 'OV Category']];

  let first = true;

  sites.forEach((site) => {
    if (!first) doc.addPage();
    first = false;

    // The same masthead the parade states carry.
    const afterHeader = drawReportHeader(doc, {
      logo,
      title: 'DAILY REPORT BY EMPLOYEE',
      subtitle: `AS OF ${dmy(dateStr)}`,
    });

    // Then the site's own line, the way the legacy report heads each block.
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text('Location', margin, afterHeader + 4);
    doc.text(site.clientName.toUpperCase(), margin + 18, afterHeader + 4);
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text(`Date :  ${dmy(dateStr)}`, pageWidth - margin, afterHeader + 4, { align: 'right' });

    const body = [];
    site.shifts.forEach((block) => {
      // The shift letter heads its own band, as the legacy sheet prints it.
      body.push([{ content: block.shift, colSpan: 7, styles: { fontStyle: 'bold', halign: 'left' } }]);
      block.rows.forEach((row) => {
        body.push([
          block.shift,
          row.attendance || '',
          row.empId,
          cleanName(row.employeeName),
          row.category || '',
          row.otClientName || '',
          row.ovCategory || '',
        ]);
      });
    });

    autoTable(doc, {
      head,
      body,
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
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 13, halign: 'center' },
        2: { cellWidth: 19, halign: 'center' },
        3: { cellWidth: 44 },
        4: { cellWidth: 27 },
        5: { cellWidth: 38 },
        6: { cellWidth: 25 },
      },
      margin: { left: margin, right: margin, bottom: 14 },
    });

    const count = site.shifts.reduce((total, block) => total + block.rows.length, 0);
    doc.setFont('helvetica', 'normal').setFontSize(7.5);
    doc.text(`${count} guard(s)`, margin, doc.lastAutoTable.finalY + 5);
  });

  if (first) {
    // Nothing to show, but a page still has to say so.
    const afterHeader = drawReportHeader(doc, {
      logo,
      title: 'DAILY REPORT BY EMPLOYEE',
      subtitle: `AS OF ${dmy(dateStr)}`,
    });
    doc.setFont('helvetica', 'normal').setFontSize(10);
    doc.text('No attendance was marked on this date', pageWidth / 2, afterHeader + 10, {
      align: 'center',
    });
  }

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

export default buildDailyEmployeePdf;
