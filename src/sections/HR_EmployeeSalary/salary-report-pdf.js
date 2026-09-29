// eslint-disable-next-line new-cap -- jsPDF is the library's own exported name
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ----------------------------------------------------------------------
// The three printed salary reports, drawn as the legacy system prints them:
//
//   1. the detailed sheet, a table per client
//   2. the summary, one line per client with paid against unpaid
//   3. the Mobilink list, what the bank transfer file is keyed on
//
// The individual voucher is not here: that is the slip the salary sheet
// already prints, built in salarystatus/salary-slip-pdf.
// ----------------------------------------------------------------------

const COMPANY = 'GUARDS MARK SECURITY SERVICES (PVT) LTD.';
const LOGO = '/assets/images/gms.png';

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (v) => Math.round(num(v)).toLocaleString('en-US');

const money2 = (v) =>
  num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const today = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** LASTNAME is '-' for most of the legacy rows, which prints as a dangling dash. */
const cleanName = (name) => String(name || '').replace(/\s*-\s*$/, '').trim();

/** The day of the month the salary is dated, which is the summary's DATE column. */
const dayOf = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : String(d.getDate()).padStart(2, '0');
};

/**
 * Mobilink pays into the guard's own mobile number, so the account number is
 * that number in international form: 0302-2610554 becomes 923022610554.
 */
export const mobileAccount = (cell) => {
  const digits = String(cell || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('92')) return digits;
  return `92${digits.replace(/^0+/, '')}`;
};

async function logoDataUrl() {
  try {
    const res = await fetch(LOGO);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Rows in the order they print: by client, then by name. */
function byClient(rows) {
  const groups = new Map();
  rows.forEach((r) => {
    const name = r.clientName || `Client ${r.clientId ?? '-'}`;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(r);
  });
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

// ----------------------------------------------------------------------

/**
 * Report 1 - the detailed salary sheet, a table per client, landscape because
 * twenty columns will not sit on a portrait page.
 */
export async function buildSalarySheetReportPdf(rows, { month, year }) {
  // eslint-disable-next-line new-cap -- jsPDF is the library's own exported name
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 8;

  const logo = await logoDataUrl();
  if (logo) doc.addImage(logo, 'PNG', margin + 22, 6, 12, 12);

  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(0, 0, 160);
  doc.text(COMPANY, pageW / 2, 11, { align: 'center' });

  doc.setFontSize(10).setTextColor(200, 0, 0);
  doc.text(`SALARY SHEET FOR THE MONTH OF ${MONTHS[month - 1]} ${year}`, pageW / 2, 17, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(0, 0, 0);
  doc.text(`DATE ${today()}`, pageW - margin, 8, { align: 'right' });

  const head = [[
    'S.No.', 'ID', 'FIRSTNAME', 'RANK', 'BASIC\nSALARY', 'WORK\nDAYS', 'TOTAL', 'ALLOUNCE',
    'OT\nDAYS', 'OT\nAMT', 'GROSS\nSALARY', 'ADVANCE', 'INC.\nTAX', 'LOAN\nDEDUCT',
    'VERIFY\nCHG.', 'FINE', 'EOBI', 'NET\nSALARY', 'CASH\nCHQ.', 'CLIENT',
  ]];

  let startY = 22;

  byClient(rows).forEach(([clientName, list], groupIndex) => {
    if (groupIndex > 0) startY += 3;

    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(0, 0, 0);
    if (startY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      startY = 15;
    }
    doc.text(clientName.toUpperCase(), margin + 4, startY);

    const body = list.map((r, i) => [
      i + 1,
      r.empId,
      cleanName(r.employeeName),
      r.rank || '',
      money(r.basicSalary),
      r.wDays ?? '',
      money(r.actualBSalary),
      // The allowance detail prints under the figure, as the legacy sheet does.
      `${money(r.allow)}${r.allowDetail ? `\n${String(r.allowDetail).trim()}` : ''}`,
      r.otDays ?? 0,
      money(r.otAmount),
      money(r.grossSalary),
      money(r.advance),
      money(r.iTax),
      money(r.loan),
      money(r.verification),
      money(r.fine),
      money(r.eobi),
      money(r.netSalary),
      r.cell ? 'Jazz Cash' : '',
      clientName,
    ]);

    const sum = (key) => list.reduce((t, r) => t + num(r[key]), 0);
    body.push([
      '', '', `TOTAL - ${list.length} EMPLOYEE(S)`, '',
      money(sum('basicSalary')), '', money(sum('actualBSalary')), money(sum('allow')),
      '', money(sum('otAmount')), money(sum('grossSalary')), money(sum('advance')),
      money(sum('iTax')), money(sum('loan')), money(sum('verification')), money(sum('fine')),
      money(sum('eobi')), money(sum('netSalary')), '', '',
    ]);

    autoTable(doc, {
      head,
      body,
      startY: startY + 2,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 6, cellPadding: 0.7, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: {
        fillColor: [0, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 5.5,
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 10, halign: 'center' },
        2: { cellWidth: 34 },
        3: { cellWidth: 17 },
        4: { halign: 'right' },
        5: { halign: 'center' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'center' },
        9: { halign: 'right' },
        10: { halign: 'right' },
        11: { halign: 'right' },
        12: { halign: 'right' },
        13: { halign: 'right' },
        14: { halign: 'right' },
        15: { halign: 'right' },
        16: { halign: 'right' },
        17: { halign: 'right' },
        18: { cellWidth: 12 },
        19: { cellWidth: 26 },
      },
      // The last row of each client's table is its total.
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [235, 235, 235];
        }
      },
    });

    startY = doc.lastAutoTable.finalY + 2;
  });

  return doc.output('blob');
}

// ----------------------------------------------------------------------

/**
 * Report 3 - the summary: one line per client, what has been paid and what has
 * not, with the month's grand total at the foot.
 */
export async function buildSalarySummaryPdf(rows, { month, year }) {
  // eslint-disable-next-line new-cap -- jsPDF is the library's own exported name
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;

  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(0, 0, 160);
  doc.text('GUARDS MARK SECURITY SERVICES PVT LTD.', pageW / 2, 14, { align: 'center' });

  // The cyan band the legacy summary carries under the company name.
  doc.setFillColor(0, 255, 255);
  doc.rect(pageW / 2 - 25, 17, 50, 6, 'F');
  doc.setFontSize(11).setTextColor(0, 0, 160);
  doc.text('Salary Summary', pageW / 2, 21.5, { align: 'center' });

  doc.setFont('helvetica', 'bolditalic').setFontSize(9).setTextColor(0, 0, 0);
  doc.text(
    `For The Month of ${MONTHS[month - 1].charAt(0)}${MONTHS[month - 1].slice(1).toLowerCase()} ${year}`,
    margin,
    29
  );
  doc.setFont('helvetica', 'normal');
  doc.text(`Date  ${today()}`, pageW - margin, 29, { align: 'right' });

  const groups = byClient(rows).map(([clientName, list]) => {
    const isPaid = (r) => String(r.paid || '').toLowerCase() === 'paid';
    const paid = list.filter(isPaid).reduce((t, r) => t + num(r.netSalary), 0);
    const notPaid = list.filter((r) => !isPaid(r)).reduce((t, r) => t + num(r.netSalary), 0);
    return {
      clientName,
      employees: new Set(list.map((r) => r.empId)).size,
      date: dayOf(list[0]?.salaryDate),
      paid,
      notPaid,
      total: paid + notPaid,
    };
  });

  const body = groups.map((g, i) => [
    i + 1,
    g.clientName,
    g.employees,
    g.date,
    g.notPaid ? money(g.notPaid) : '',
    g.paid ? money(g.paid) : '',
    money(g.total),
  ]);

  const grand = groups.reduce(
    (t, g) => ({
      employees: t.employees + g.employees,
      notPaid: t.notPaid + g.notPaid,
      paid: t.paid + g.paid,
      total: t.total + g.total,
    }),
    { employees: 0, notPaid: 0, paid: 0, total: 0 }
  );

  body.push([
    '',
    'GRAND TOTAL',
    grand.employees,
    '',
    grand.notPaid ? money(grand.notPaid) : '',
    grand.paid ? money(grand.paid) : '',
    money(grand.total),
  ]);

  autoTable(doc, {
    head: [['S. No.', 'LOCATION', '# of\nEmp', 'DATE', 'AMOUNT\nNOT PAID', 'AMOUNT\nPAID', 'TOTAL']],
    body,
    startY: 33,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 13, halign: 'center' },
      1: { cellWidth: 68 },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [235, 235, 235];
      }
    },
  });

  return doc.output('blob');
}

// ----------------------------------------------------------------------

/**
 * Report 4 - the Mobilink list. Only guards with a mobile number appear: the
 * number is the account the transfer goes to.
 */
export async function buildMobilinkReportPdf(rows, { month, year }) {
  // eslint-disable-next-line new-cap -- jsPDF is the library's own exported name
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;

  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(0, 0, 0);
  doc.text('Guards Mark Security Services (Pvt) Ltd.', pageW / 2, 16, { align: 'center' });
  const width = doc.getTextWidth('Guards Mark Security Services (Pvt) Ltd.');
  doc.setLineWidth(0.4);
  doc.line(pageW / 2 - width / 2, 17.5, pageW / 2 + width / 2, 17.5);

  doc.setFontSize(11);
  const label = MONTHS[month - 1];
  doc.text(
    `Salary Sheet for the Month of     ${label.charAt(0)}${label.slice(1).toLowerCase()} ${year}`,
    pageW / 2,
    25,
    { align: 'center' }
  );

  const payable = rows
    .filter((r) => mobileAccount(r.cell))
    .sort((a, b) =>
      (a.clientName || '').localeCompare(b.clientName || '') ||
      cleanName(a.employeeName).localeCompare(cleanName(b.employeeName))
    );

  const body = payable.map((r, i) => [
    i + 1,
    r.empId,
    cleanName(r.employeeName).toUpperCase(),
    r.nic || '',
    mobileAccount(r.cell),
    r.clientName || '',
    money2(r.netSalary),
  ]);

  body.push([
    '',
    '',
    `TOTAL - ${payable.length} EMPLOYEE(S)`,
    '',
    '',
    '',
    money2(payable.reduce((t, r) => t + num(r.netSalary), 0)),
  ]);

  autoTable(doc, {
    head: [['S/No', 'ID', 'FIRST NAME', 'CNIC NUMBER', 'ACCOUNT NO', 'CLIENT', 'AMOUNT']],
    body,
    startY: 31,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.6, lineColor: [0, 0, 0], lineWidth: 0.3 },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.4,
    },
    columnStyles: {
      0: { cellWidth: 11, halign: 'center' },
      1: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 42 },
      3: { cellWidth: 28, halign: 'center' },
      4: { cellWidth: 26, halign: 'center' },
      5: { cellWidth: 40 },
      6: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [235, 235, 235];
      }
    },
  });

  return doc.output('blob');
}
