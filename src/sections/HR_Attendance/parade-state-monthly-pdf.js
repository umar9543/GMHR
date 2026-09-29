import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { cleanEmployeeName } from 'src/utils/employee-name';
import { loadLogo, drawReportHeader } from './report-header';


import { drawParadeSummary, paradeSummaryRows } from './parade-state-summary';

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

/**
 * One client, one month, guard by guard - the shape the legacy report printed.
 * Each day cell carries the mark with the shift underneath it.
 */
export async function buildMonthlyParadeStatePdf(data) {
  const { client, records, year, month, daysInMonth } = data;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const logo = await loadLogo();
  drawReportHeader(doc, {
    logo,
    title: `MONTHLY PARADE STATE - ${MONTHS[month - 1]} ${year}`,
    subtitle: client?.clientName || '',
  });
  doc.setFont('helvetica', 'normal').setFontSize(7.5);
  doc.text(
    `Group: ${client?.groupName || '-'}    Required: ${client?.reqDay || 0} day / ${client?.reqNight || 0} night`,
    pageWidth / 2,
    36.5,
    { align: 'center' }
  );

  const head = [['Sno', 'Rank', 'Guard', ...days.map(String), 'P', 'A', 'L', 'OT']];

  const body = records.map((row, i) => {
    const cells = days.map((d) => {
      const status = row.days[String(d)] || '';
      const shift = row.days[`s${d}`] || '';
      if (status && shift) return `${status}\n${shift}`;
      return status || '-';
    });
    return [
      String(i + 1),
      row.rank || '-',
      cleanEmployeeName(row.employeeName) || `Employee ${row.employeeId}`,
      ...cells,
      String(row.present),
      String(row.absent),
      String(row.leave),
      String(row.overtime),
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 40,
    theme: 'grid',
    styles: {
      fontSize: 5.2,
      cellPadding: 0.6,
      halign: 'center',
      lineColor: [80, 80, 80],
      lineWidth: 0.1,
    },
    headStyles: { fillColor: [33, 43, 54], textColor: 255, fontStyle: 'bold', fontSize: 5.2 },
    columnStyles: {
      0: { cellWidth: 7 },
      1: { cellWidth: 24, halign: 'left' },
      2: { cellWidth: 34, halign: 'left' },
    },
    didParseCell: (data2) => {
      if (data2.section !== 'body') return;
      // Only the day cells carry marks; a guard named "Aslam" is not an absence.
      const firstDayColumn = 3;
      const column = data2.column.index;
      if (column < firstDayColumn || column >= firstDayColumn + days.length) return;
      const raw = String(data2.cell.raw || '');
      if (raw.startsWith('A')) data2.cell.styles.textColor = [183, 29, 24];
      else if (raw.startsWith('L')) data2.cell.styles.textColor = [255, 171, 0];
    },
    margin: { left: 6, right: 6, bottom: 12 },
  });

  // The monthly sheet counts guard-days, so the summary is measured the same
  // way: contracted strength over the days actually marked this month.
  const duty = { standard: { day: 0, night: 0 }, overtime: { day: 0, night: 0 } };
  const markedDays = new Set();

  records.forEach((row) => {
    days.forEach((d) => {
      const status = row.days[String(d)];
      if (!status) return;
      markedDays.add(d);
      const shift = row.days[`s${d}`] === 'N' ? 'night' : 'day';
      if (String(status).startsWith('P')) duty.standard[shift] += 1;
      if (status === 'P/OT' || status === 'OT') duty.overtime[shift] += 1;
    });
  });

  const dutyDays = markedDays.size;
  drawParadeSummary(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    margin: 6,
    caption: `Guard-days over the ${dutyDays} day(s) marked in ${MONTHS[month - 1]} ${year}.`,
    rows: paradeSummaryRows({
      contract: {
        day: (client?.reqDay || 0) * dutyDays,
        night: (client?.reqNight || 0) * dutyDays,
      },
      standard: duty.standard,
      overtime: duty.overtime,
    }),
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal').setFontSize(7);
    doc.text(`${records.length} guards`, 6, doc.internal.pageSize.getHeight() - 6);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 6,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'right' }
    );
  }

  return doc.output('bloburl');
}

export default buildMonthlyParadeStatePdf;
