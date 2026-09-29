import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

// ----------------------------------------------------------------------
// The salary reports, saved as something other than a PDF.
//
// Each report is first described as a plain table - a title, columns and rows
// of raw values - and the spreadsheet and the deck are both built from that.
// Figures stay numbers rather than formatted text, so a total still adds up in
// Excel once it is opened.
// ----------------------------------------------------------------------

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** LASTNAME is '-' for most of the legacy rows, which prints as a dangling dash. */
const cleanName = (name) => String(name || '').replace(/\s*-\s*$/, '').trim();

const dayOf = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : String(d.getDate()).padStart(2, '0');
};

/** Mobilink pays into the guard's mobile number: 0302-2610554 -> 923022610554. */
const mobileAccount = (cell) => {
  const digits = String(cell || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('92') ? digits : `92${digits.replace(/^0+/, '')}`;
};

const byClient = (rows) => {
  const groups = new Map();
  rows.forEach((r) => {
    const name = r.clientName || `Client ${r.clientId ?? '-'}`;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(r);
  });
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
};

// ----------------------------------------------------------------------

/**
 * The report as a table: what the spreadsheet writes and the deck draws.
 * `type` is the report type the screen is showing.
 */
export function reportTable(type, rows, { month, year }) {
  const period = `${MONTHS[month - 1]} ${year}`;

  if (type === 'summary') {
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
      };
    });

    const body = groups.map((g, i) => [
      i + 1,
      g.clientName,
      g.employees,
      g.date,
      g.notPaid,
      g.paid,
      g.notPaid + g.paid,
    ]);

    const totals = groups.reduce(
      (t, g) => [t[0] + g.employees, t[1] + g.notPaid, t[2] + g.paid],
      [0, 0, 0]
    );
    body.push(['', 'GRAND TOTAL', totals[0], '', totals[1], totals[2], totals[1] + totals[2]]);

    return {
      name: 'Salary Summary',
      title: 'Salary Summary',
      subtitle: `For the month of ${period}`,
      columns: [
        { label: 'S. No.', width: 8 },
        { label: 'Location', width: 42 },
        { label: '# of Emp', width: 10, numeric: true },
        { label: 'Date', width: 8 },
        { label: 'Amount Not Paid', width: 16, numeric: true },
        { label: 'Amount Paid', width: 16, numeric: true },
        { label: 'Total', width: 16, numeric: true },
      ],
      body,
      totalRow: true,
    };
  }

  if (type === 'mobilink') {
    const payable = rows
      .filter((r) => mobileAccount(r.cell))
      .sort(
        (a, b) =>
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
      num(r.netSalary),
    ]);

    body.push([
      '',
      '',
      `TOTAL - ${payable.length} EMPLOYEE(S)`,
      '',
      '',
      '',
      payable.reduce((t, r) => t + num(r.netSalary), 0),
    ]);

    return {
      name: 'Mobilink Salary',
      title: 'Mobilink Salary Report',
      subtitle: `Salary sheet for the month of ${period}`,
      columns: [
        { label: 'S/No', width: 7 },
        { label: 'ID', width: 9 },
        { label: 'First Name', width: 30 },
        { label: 'CNIC Number', width: 18 },
        // Kept as text: a 12-digit account must not become 9.23023E+11.
        { label: 'Account No', width: 16, text: true },
        { label: 'Client', width: 34 },
        { label: 'Amount', width: 14, numeric: true },
      ],
      body,
      totalRow: true,
    };
  }

  // The detailed sheet, and the individual report, which is one guard's line
  // of that same sheet.
  const ordered = byClient(rows).flatMap(([, list]) => list);
  const body = ordered.map((r, i) => [
    i + 1,
    r.empId,
    cleanName(r.employeeName),
    r.rank || '',
    num(r.basicSalary),
    num(r.wDays),
    num(r.actualBSalary),
    num(r.allow),
    String(r.allowDetail || '').trim(),
    num(r.otDays),
    num(r.otAmount),
    num(r.grossSalary),
    num(r.advance),
    num(r.iTax),
    num(r.loan),
    num(r.verification),
    num(r.fine),
    num(r.eobi),
    num(r.netSalary),
    r.cell ? 'Jazz Cash' : '',
    r.clientName || '',
  ]);

  const sum = (key) => ordered.reduce((t, r) => t + num(r[key]), 0);
  if (ordered.length > 1) {
    body.push([
      '',
      '',
      `TOTAL - ${ordered.length} EMPLOYEE(S)`,
      '',
      sum('basicSalary'),
      '',
      sum('actualBSalary'),
      sum('allow'),
      '',
      '',
      sum('otAmount'),
      sum('grossSalary'),
      sum('advance'),
      sum('iTax'),
      sum('loan'),
      sum('verification'),
      sum('fine'),
      sum('eobi'),
      sum('netSalary'),
      '',
      '',
    ]);
  }

  return {
    name: type === 'individual' ? 'Salary Slip' : 'Salary Report',
    title: type === 'individual' ? 'Salary Slip' : 'Salary Sheet',
    subtitle: `For the month of ${period}`,
    columns: [
      { label: 'S.No.', width: 7 },
      { label: 'ID', width: 9 },
      { label: 'First Name', width: 26 },
      { label: 'Rank', width: 18 },
      { label: 'Basic Salary', width: 13, numeric: true },
      { label: 'Work Days', width: 11, numeric: true },
      { label: 'Total', width: 13, numeric: true },
      { label: 'Allowance', width: 12, numeric: true },
      { label: 'Allow Detail', width: 16 },
      { label: 'OT Days', width: 9, numeric: true },
      { label: 'OT Amt', width: 12, numeric: true },
      { label: 'Gross Salary', width: 13, numeric: true },
      { label: 'Advance', width: 12, numeric: true },
      { label: 'Inc. Tax', width: 11, numeric: true },
      { label: 'Loan Deduct', width: 12, numeric: true },
      { label: 'Verify Chg.', width: 12, numeric: true },
      { label: 'Fine', width: 11, numeric: true },
      { label: 'EOBI', width: 10, numeric: true },
      { label: 'Net Salary', width: 13, numeric: true },
      { label: 'Cash Chq.', width: 11 },
      { label: 'Client', width: 32 },
    ],
    body,
    totalRow: ordered.length > 1,
  };
}

// ----------------------------------------------------------------------

const COMPANY = 'GUARDS MARK SECURITY SERVICES (PVT) LTD.';

/** The report as a spreadsheet. Numbers stay numbers, so totals still add up. */
export function buildExcel(table) {
  const header = table.columns.map((c) => c.label);
  const aoa = [[COMPANY], [table.title], [table.subtitle], [], header, ...table.body];

  const sheet = XLSX.utils.aoa_to_sheet(aoa, { cellDates: false });
  sheet['!cols'] = table.columns.map((c) => ({ wch: c.width || 14 }));
  // The three title lines run across the table.
  sheet['!merges'] = [0, 1, 2].map((r) => ({
    s: { r, c: 0 },
    e: { r, c: Math.max(table.columns.length - 1, 1) },
  }));

  // An account number is digits, not a quantity: keep it as text.
  table.columns.forEach((column, index) => {
    if (!column.text) return;
    for (let r = 0; r < table.body.length; r += 1) {
      const address = XLSX.utils.encode_cell({ r: r + 5, c: index });
      const cell = sheet[address];
      if (cell && cell.v !== '') {
        cell.t = 's';
        cell.v = String(cell.v);
      }
    }
  });

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, table.name.slice(0, 31));

  const out = XLSX.write(book, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * The report as a deck: a title slide, then the table over as many slides as
 * it takes. Wide layout, because these tables are wide.
 */
export async function buildPptx(table) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.company = COMPANY;
  pptx.title = table.title;

  const cover = pptx.addSlide();
  cover.addText(COMPANY, {
    x: 0.5, y: 2.2, w: 12.3, h: 0.7, fontSize: 28, bold: true, align: 'center', color: '000080',
  });
  cover.addText(table.title, {
    x: 0.5, y: 3.0, w: 12.3, h: 0.6, fontSize: 22, align: 'center', color: 'C00000',
  });
  cover.addText(table.subtitle, {
    x: 0.5, y: 3.7, w: 12.3, h: 0.5, fontSize: 16, align: 'center', color: '444444',
  });
  cover.addText(`${table.body.length} row(s)`, {
    x: 0.5, y: 4.3, w: 12.3, h: 0.4, fontSize: 12, align: 'center', color: '888888',
  });

  const money = (v) =>
    typeof v === 'number'
      ? v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
      : String(v ?? '');

  const head = table.columns.map((c) => ({
    text: c.label,
    options: { bold: true, fill: '00FFFF', color: '000000', align: 'center' },
  }));

  const body = table.body.map((row, rowIndex) => {
    const last = table.totalRow && rowIndex === table.body.length - 1;
    return row.map((cell, index) => ({
      text: table.columns[index]?.numeric ? money(cell) : String(cell ?? ''),
      options: {
        align: table.columns[index]?.numeric ? 'right' : 'left',
        bold: last,
        fill: last ? 'EEEEEE' : 'FFFFFF',
      },
    }));
  });

  const slide = pptx.addSlide();
  slide.addText(`${table.title} - ${table.subtitle}`, {
    x: 0.3, y: 0.2, w: 12.7, h: 0.4, fontSize: 14, bold: true, color: '000080',
  });

  slide.addTable([head, ...body], {
    x: 0.3,
    y: 0.7,
    w: 12.7,
    colW: table.columns.map(
      (c) => (12.7 * (c.width || 14)) / table.columns.reduce((t, x) => t + (x.width || 14), 0)
    ),
    fontSize: table.columns.length > 12 ? 6 : 9,
    border: { pt: 0.4, color: '999999' },
    // Carries on over as many slides as the rows need.
    autoPage: true,
    autoPageRepeatHeader: true,
    autoPageSlideStartY: 0.7,
  });

  const blob = await pptx.write({ outputType: 'blob' });
  return blob;
}
