import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { cleanEmployeeName } from 'src/utils/employee-name';

const COMPANY = 'Guards Mark Security';
const ADDRESS =
  'Plot# C-1-C, Mezzanine Floor, Lane-1, Sehar Commercial, Phase-7, D.H.A, Karachi, Pakistan.';

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

async function loadLogo() {
  try {
    const res = await fetch('/assets/images/gms.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

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
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 12, 8, 22, 22);
    } catch {
      /* a missing logo must not stop the report */
    }
  }

  doc.setFont('helvetica', 'bold').setFontSize(15);
  doc.text(COMPANY, pageWidth / 2, 15, { align: 'center' });
  doc.setFont('helvetica', 'normal').setFontSize(7.5);
  doc.text(ADDRESS, pageWidth / 2, 20, { align: 'center' });
  doc.setFont('helvetica', 'bold').setFontSize(11);
  doc.text(
    `MONTHLY PARADE STATE - ${MONTHS[month - 1]} ${year}`,
    pageWidth / 2,
    27,
    { align: 'center' }
  );
  doc.setFontSize(9);
  doc.text(`${client?.clientName || ''}`, pageWidth / 2, 32, { align: 'center' });
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
      const raw = String(data2.cell.raw || '');
      if (raw.startsWith('A')) data2.cell.styles.textColor = [183, 29, 24];
      else if (raw.startsWith('L')) data2.cell.styles.textColor = [255, 171, 0];
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
