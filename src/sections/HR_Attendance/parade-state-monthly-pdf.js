import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { cleanEmployeeName } from 'src/utils/employee-name';
import { loadLogo, drawReportHeader } from './report-header';

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

/**
 * One client, one month, guard by guard - the shape the legacy report printed.
 * Each day cell carries the mark with the shift underneath it.
 */
export async function buildMonthlyParadeStatePdf(data) {
  const { client, records, year, month, daysInMonth, requiredByDay } = data;
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

  // ---------------------------------------------------------------- totals
  // From the table alone. Each day: guards on post by day and by night, the
  // overtime, and the day's total - the legacy report's Total row. A P/OT
  // guard worked both shifts here, so his overtime covers the other shift;
  // an OT guard is posted at another client and covered overtime here, on
  // the shift shown under his mark.
  const perDay = new Map();
  const sums = { day: 0, night: 0, ot: 0, otDay: 0, otNight: 0 };
  records.forEach((row) => {
    days.forEach((d) => {
      const status = String(row.days[String(d)] || '');
      if (!status) return;
      if (!perDay.has(d)) perDay.set(d, { day: 0, night: 0, ot: 0 });
      const t = perDay.get(d);
      const night = row.days[`s${d}`] === 'N';
      if (status.startsWith('P')) {
        t[night ? 'night' : 'day'] += 1;
        sums[night ? 'night' : 'day'] += 1;
      }
      if (status === 'P/OT') {
        t.ot += 1;
        sums.ot += 1;
        sums[night ? 'otDay' : 'otNight'] += 1;
      } else if (status === 'OT') {
        t.ot += 1;
        sums.ot += 1;
        sums[night ? 'otNight' : 'otDay'] += 1;
      }
    });
  });
  const grand = (key) => records.reduce((n, row) => n + (Number(row[key]) || 0), 0);

  const totalRow = [
    { content: 'Total', colSpan: 2, styles: { halign: 'left', valign: 'middle' } },
    { content: ['Day', 'Night', 'OT', 'Total'].join('\n'), styles: { halign: 'right' } },
    ...days.map((d) => {
      const t = perDay.get(d);
      return t ? [t.day, t.night, t.ot, t.day + t.night + t.ot].join('\n') : '-';
    }),
    [sums.day, sums.night, sums.ot, sums.day + sums.night + sums.ot].join('\n'),
    String(grand('absent')),
    String(grand('leave')),
    String(grand('overtime')),
  ];
  body.push(totalRow);
  const totalIndex = body.length - 1;

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
      if (data2.row.index === totalIndex) {
        data2.cell.styles.fontStyle = 'bold';
        data2.cell.styles.fillColor = [244, 246, 248];
        return;
      }
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

  // --------------------------------------------------------------- summary
  // Guard-days over the days the table holds: what the client asked for,
  // what was on post, the overtime that covered, and what was still short -
  // by shift, as the parade state's SH columns count it.
  const dutyDays = perDay.size;
  // Each day at the strength contracted that day: a contract can change in the
  // middle of the month (an older API sends only the month's strength).
  const req = [...perDay.keys()].reduce(
    (t, d) => {
      const r = requiredByDay?.[String(d)];
      return {
        day: t.day + (r ? Number(r.day) || 0 : client?.reqDay || 0),
        night: t.night + (r ? Number(r.night) || 0 : client?.reqNight || 0),
      };
    },
    { day: 0, night: 0 }
  );
  const short = {
    day: Math.max(0, req.day - sums.day - sums.otDay),
    night: Math.max(0, req.night - sums.night - sums.otNight),
  };
  const extra = Math.max(0, sums.day + sums.night + sums.ot - req.day - req.night);
  const line = (label, day, night) => [label, String(day), String(night), String(day + night)];
  const summary = [
    line('Required Guards', req.day, req.night),
    line('Observed Guards', sums.day, sums.night),
    line('OT Guards', sums.otDay, sums.otNight),
    line('Shortage Guards', short.day, short.night),
  ];
  if (extra) summary.push(['Extra Guards', '', '', String(extra)]);

  let summaryY = doc.lastAutoTable.finalY + 6;
  if (summaryY > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    summaryY = 16;
  }
  doc.setFont('helvetica', 'normal').setFontSize(7);
  doc.text(
    `Guard-days over the ${dutyDays} day(s) with attendance in ${MONTHS[month - 1]} ${year}.`,
    6,
    summaryY
  );
  autoTable(doc, {
    head: [['', 'Day', 'Night', 'Total']],
    body: summary,
    startY: summaryY + 2,
    theme: 'grid',
    tableWidth: 90,
    styles: { fontSize: 7, cellPadding: 1, halign: 'center', lineColor: [80, 80, 80], lineWidth: 0.1 },
    headStyles: { fillColor: [33, 43, 54], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 36 } },
    didParseCell: (data2) => {
      if (data2.section === 'body' && data2.row.index === 3 && data2.column.index > 0) {
        const n = Number(data2.cell.raw) || 0;
        if (n > 0) data2.cell.styles.textColor = [183, 29, 24];
      }
    },
    margin: { left: 6, right: 6, bottom: 12 },
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
