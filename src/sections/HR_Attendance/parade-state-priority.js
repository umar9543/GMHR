import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { isExtra, totalsOf, withDerived, siteCellText, PARADE_COLUMNS } from './parade-state-utils';

// ----------------------------------------------------------------------
// The Daily Parade State in priority order, as the legacy "priority sheet"
// prints it: client groups by the guards they contract for, the largest
// first, and within a group the sites in client order.
//
// The legacy GROUPNAMES.PRIORITY held the same thing - minus the group's
// total, sorted ascending - but it was never kept up to date, so the order
// is worked out from today's requirements instead.
//
// EP sites (contract code EP, or named "EP-...") are not posts a client
// contracts for; they are left out of the sheet and reported as the EP
// strength under the summary. Sites asking for no guards are left out too,
// as the legacy sheet leaves them out.
// ----------------------------------------------------------------------

export const isEpSite = (r) =>
  String(r.contractCode || '').trim().toUpperCase() === 'EP' || /^EP\s*-/i.test(String(r.clientName || '').trim());

export function priorityRows(records) {
  const ep = { day: 0, night: 0, sites: 0 };
  const unlisted = { day: 0, night: 0, sites: 0 };
  const listed = [];

  (records || []).forEach((record) => {
    const row = withDerived(record);
    if (isEpSite(row)) {
      // Guards on post there; a P/P guard is one guard, not two.
      ep.sites += 1;
      ep.day += row.preDay;
      ep.night += row.preNight;
    } else if (row.reqTotal > 0) {
      listed.push(row);
    } else if (row.preDay + row.preNight + row.otDay + row.otNight > 0) {
      // Guards on post at a site that asks for none - the company's own
      // office is one. Not on the sheet, but counted so nothing goes missing.
      unlisted.sites += 1;
      unlisted.day += row.preDay + row.otDay;
      unlisted.night += row.preNight + row.otNight;
    }
  });

  const index = new Map();
  listed.forEach((row) => {
    const name = row.groupName || '(no group)';
    if (!index.has(name)) index.set(name, { groupName: name, rows: [] });
    index.get(name).rows.push(row);
  });

  const groups = Array.from(index.values()).map((group) => ({
    ...group,
    rows: [...group.rows].sort((a, b) => a.clientId - b.clientId),
    totals: totalsOf(group.rows),
  }));

  groups.sort(
    (a, b) => b.totals.reqTotal - a.totals.reqTotal || a.groupName.localeCompare(b.groupName)
  );

  return { groups, grandTotals: totalsOf(listed), rowCount: listed.length, ep, unlisted };
}

/** The six lines under the sheet, as the legacy summary words them. */
export function prioritySummary({ grandTotals: t, ep }) {
  return [
    { label: 'Total Strength (Contract) :', day: t.reqDay, night: t.reqNight },
    { label: 'Total Strength (Standard Duty) :', day: t.preDay, night: t.preNight },
    { label: 'Total Overtime :', day: t.otDay, night: t.otNight, fill: 'ot' },
    { label: 'Total Shortage:', day: t.shDay, night: t.shNight, fill: 'sh' },
    // The EP clients' guards are the reserve, not guarding: legacy 5 Oct 2026,
    // 240 standard + 0 OT - 5 EP = 235 by day; 139 + 1 - 0 = 140 by night.
    {
      label: 'Total GuardingStrength :',
      day: t.preDay + t.otDay - (ep?.day || 0),
      night: t.preNight + t.otNight - (ep?.night || 0),
    },
    { label: 'Total EP Strength :', day: ep.day, night: ep.night },
  ];
}

// --------------------------------------------------------------------- PDF

const COMPANY = 'GUARDS MARK SECURITY SERVICES (PVT) LTD.';

// The legacy sheet's colours.
const YELLOW = [255, 255, 0];
const CYAN = [0, 255, 255];
const RED = [237, 28, 36];
const GREY = [191, 191, 191];
const GREEN = [0, 255, 0];
const NAVY = [0, 0, 128];
const BLUE = [0, 0, 255];

const OT_KEYS = new Set(['otDay', 'otNight']);
const SH_KEYS = new Set(['shDay', 'shNight']);

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const HEAD_LABELS = {
  reqTotal: 'Req\nGD',
  reqDay: 'REQ\nDAY',
  preDay: 'PRE\nDAY',
  defDay: 'DEF\nDAY',
  otDay: 'OT\nDAY',
  shDay: 'SH\nDAY',
  reqNight: 'REQ\nN',
  preNight: 'PRE\nN',
  defNight: 'DEF\nN',
  otNight: 'OT\nN',
  shNight: 'SH\nN',
};

/** Builds the priority sheet and returns a blob URL. */
export async function buildParadePriorityPdf(records, dateStr) {
  const sheet = priorityRows(records);
  const { groups, grandTotals } = sheet;

  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;

  // ------------------------------------------------------------ masthead
  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...NAVY);
  doc.text(COMPANY, pageWidth / 2, 12, { align: 'center' });

  doc.setFillColor(...GREEN).rect(margin, 15, pageWidth - margin * 2, 5.5, 'F');
  doc.setFont('times', 'bold').setFontSize(10).setTextColor(...BLUE);
  doc.text('DAILY PARADE STATE', pageWidth / 2, 19, { align: 'center' });

  doc.setFont('times', 'bold').setFontSize(8.5).setTextColor(0, 0, 0);
  doc.text(`AS OF ${formatDate(dateStr)}`, pageWidth / 2, 24.5, { align: 'center' });

  // ---------------------------------------------------------------- body
  // kind: 'site' | 'subtotal' | 'spacer' | 'total', read back when styling.
  const kinds = [];
  const body = [];
  const numbers = (source) => PARADE_COLUMNS.map((c) => String(source[c.key] ?? 0));

  let sno = 0;
  groups.forEach((group) => {
    group.rows.forEach((row) => {
      sno += 1;
      // A site's DEF and SH show "+n" when it is over strength.
      body.push([
        String(sno),
        row.clientName,
        group.groupName,
        ...PARADE_COLUMNS.map((c) => siteCellText(row, c.key)),
      ]);
      kinds.push('site');
    });
    // A group of several sites closes on its subtotal; a lone site's group
    // has nothing to add up. Either way a blank line follows, so one group
    // reads apart from the next.
    if (group.rows.length > 1) {
      body.push(['', '', group.groupName, ...numbers(group.totals)]);
      kinds.push('subtotal');
    }
    body.push(['', '', '', ...PARADE_COLUMNS.map(() => '')]);
    kinds.push('spacer');
  });
  body.push(['', 'Total', '', ...numbers(grandTotals)]);
  kinds.push('total');

  const columnKey = (index) => PARADE_COLUMNS[index - 3]?.key;

  autoTable(doc, {
    startY: 26.5,
    head: [['Sno #', 'Locations', 'Group Name', ...PARADE_COLUMNS.map((c) => HEAD_LABELS[c.key])]],
    body,
    theme: 'grid',
    margin: { left: margin, right: margin, top: 10, bottom: 10 },
    styles: {
      font: 'times',
      fontSize: 8,
      cellPadding: { top: 1, bottom: 1, left: 1, right: 1 },
      halign: 'center',
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'normal',
      fontSize: 8,
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 11 },
      // One line a site, as the legacy sheet prints: a long name is cut short.
      1: { cellWidth: 62, halign: 'left', font: 'helvetica', fontSize: 6.5, overflow: 'ellipsize' },
      2: { cellWidth: 58, halign: 'left', font: 'helvetica', fontSize: 6.5, overflow: 'ellipsize' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const kind = kinds[data.row.index];
      const key = columnKey(data.column.index);
      const { styles } = data.cell;

      if (kind === 'spacer') {
        styles.fillColor = [255, 255, 255];
        if (OT_KEYS.has(key)) styles.fillColor = YELLOW;
        if (SH_KEYS.has(key)) styles.fillColor = GREY;
        styles.minCellHeight = 5;
        return;
      }

      styles.fillColor = YELLOW;
      if (OT_KEYS.has(key)) styles.fillColor = CYAN;
      if (SH_KEYS.has(key)) styles.fillColor = RED;

      if (kind === 'subtotal' || kind === 'total') {
        styles.fontStyle = 'bold';
        if (data.column.index === 1 || data.column.index === 2) {
          styles.font = 'times';
          styles.fontSize = kind === 'total' ? 8.5 : 7;
        }
        if (kind === 'total' && data.column.index === 1) styles.halign = 'center';
      }

      // Still uncovered after overtime: what the sheet is for.
      if (SH_KEYS.has(key) && !isExtra(data.cell.raw) && Number(data.cell.raw) > 0) {
        styles.textColor = [255, 255, 255];
        styles.fontStyle = 'bold';
      }
    },
  });

  // ------------------------------------------------------------- summary
  const rows = prioritySummary(sheet);
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = doc.lastAutoTable.finalY + 8;
  if (y + 8 + rows.length * 7 > pageHeight - 10) {
    doc.addPage();
    y = 14;
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin },
    tableWidth: 136,
    head: [['', 'D', 'N', 'Total']],
    body: rows.map((r) => [r.label, String(r.day), String(r.night), String(r.day + r.night)]),
    theme: 'grid',
    styles: {
      font: 'times',
      fontSize: 8.5,
      cellPadding: 1.8,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
      halign: 'right',
    },
    headStyles: { fillColor: GREY, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 64, fontStyle: 'bold' },
      1: { cellWidth: 24 },
      2: { cellWidth: 24 },
      3: { cellWidth: 24 },
    },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index === 0) return;
      const { fill } = rows[data.row.index];
      if (fill === 'ot') data.cell.styles.fillColor = CYAN;
      if (fill === 'sh') data.cell.styles.fillColor = RED;
    },
  });

  // --------------------------------------------------------- page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('times', 'normal').setFontSize(8).setTextColor(0, 0, 0);
    // Above the masthead on the first page and above the table on the rest.
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, 7, { align: 'right' });
  }

  return doc.output('bloburl');
}

export default buildParadePriorityPdf;
