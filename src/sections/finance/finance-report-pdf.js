import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ---------------------------------------------------------------------------
// PDF builders for the three finance reports. They share a header and a money
// format so the printed set looks like one pack.
// ---------------------------------------------------------------------------

const COMPANY = 'Guards Mark Security';
const ADDRESS =
  'Plot# C-1-C, Mezzanine Floor, Lane-1, Sehar Commercial, Phase-7, D.H.A, Karachi, Pakistan.';

const money = (v) => {
  const n = Number(v || 0);
  if (!n) return '-';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fDate = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '');

function periodLabel(fromDate, toDate, asAt) {
  if (asAt) return `AS AT ${fDate(asAt)}`;
  if (fromDate && toDate) return `${fDate(fromDate)}  TO  ${fDate(toDate)}`;
  if (toDate) return `UP TO ${fDate(toDate)}`;
  if (fromDate) return `FROM ${fDate(fromDate)}`;
  return 'ALL DATES';
}

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

/** Company header, report title and period. Returns the y to start the table at. */
async function header(doc, title, subtitle, period) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = await loadLogo();
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 12, 8, 20, 20);
    } catch {
      /* a missing logo must not stop the report */
    }
  }

  doc.setFont('helvetica', 'bold').setFontSize(14);
  doc.text(COMPANY, pageWidth / 2, 14, { align: 'center' });
  doc.setFont('helvetica', 'normal').setFontSize(7);
  doc.text(ADDRESS, pageWidth / 2, 19, { align: 'center' });
  doc.setFont('helvetica', 'bold').setFontSize(11);
  doc.text(title, pageWidth / 2, 26, { align: 'center' });

  let y = 31;
  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }
  doc.setFont('helvetica', 'normal').setFontSize(8);
  doc.text(period, pageWidth / 2, y, { align: 'center' });
  return y + 5;
}

function footer(doc, note) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal').setFontSize(7);
    if (note) doc.text(note, 10, pageHeight - 6);
    doc.text(`Page ${i} of ${pages}`, pageWidth - 10, pageHeight - 6, { align: 'right' });
  }
}

const GRID = {
  theme: 'grid',
  styles: { fontSize: 7, cellPadding: 1.2, lineColor: [90, 90, 90], lineWidth: 0.1 },
  headStyles: { fillColor: [33, 43, 54], textColor: 255, fontStyle: 'bold', fontSize: 7 },
};

// --- Trial balance ---------------------------------------------------------

export async function buildTrialBalancePdf(data) {
  const { records, totals, fromDate, toDate } = data;
  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = await header(doc, 'TRIAL BALANCE', null, periodLabel(fromDate, toDate));

  const body = [];
  let group = null;
  records.forEach((r) => {
    if (r.mainGroupName !== group) {
      group = r.mainGroupName;
      body.push([{ content: group || '(no group)', colSpan: 8, styles: { fontStyle: 'bold', fillColor: [242, 244, 246] } }]);
    }
    body.push([
      `${r.caCode}-${r.acCode}`,
      r.accountName || '',
      money(r.openingDr),
      money(r.openingCr),
      money(r.periodDr),
      money(r.periodCr),
      money(r.closingDr),
      money(r.closingCr),
    ]);
  });
  body.push([
    { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold' } },
    { content: money(totals.openingDr), styles: { fontStyle: 'bold' } },
    { content: money(totals.openingCr), styles: { fontStyle: 'bold' } },
    { content: money(totals.periodDr), styles: { fontStyle: 'bold' } },
    { content: money(totals.periodCr), styles: { fontStyle: 'bold' } },
    { content: money(totals.closingDr), styles: { fontStyle: 'bold' } },
    { content: money(totals.closingCr), styles: { fontStyle: 'bold' } },
  ]);

  autoTable(doc, {
    ...GRID,
    startY,
    head: [
      [
        { content: 'Code', rowSpan: 2 },
        { content: 'Account', rowSpan: 2 },
        { content: 'Opening', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Period', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Closing', colSpan: 2, styles: { halign: 'center' } },
      ],
      ['Debit', 'Credit', 'Debit', 'Credit', 'Debit', 'Credit'],
    ],
    body,
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 80 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
    margin: { left: 8, right: 8, bottom: 12 },
  });

  const diff = totals.closingDr - totals.closingCr;
  footer(doc, Math.abs(diff) < 0.005 ? `${records.length} accounts` : `${records.length} accounts — out of balance by ${money(diff)}`);
  return doc.output('bloburl');
}

// --- Account ledger --------------------------------------------------------

export async function buildLedgerPdf(data) {
  const { account, records, opening, closing, totalDr, totalCr, fromDate, toDate } = data;
  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const who = account.partyName
    ? `${account.caCode}-${account.acCode}  ${account.accountName} — ${account.partyName}`
    : `${account.caCode}-${account.acCode}  ${account.accountName}`;
  const startY = await header(doc, 'ACCOUNT LEDGER', who, periodLabel(fromDate, toDate));

  const body = [
    [
      { content: 'Opening balance', colSpan: 4, styles: { fontStyle: 'bold' } },
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: money(opening), styles: { fontStyle: 'bold', halign: 'right' } },
    ],
  ];
  records.forEach((e) => {
    body.push([
      fDate(e.voucherDate),
      e.voucherType || '',
      String(e.voucherCode ?? ''),
      (e.partyName || e.narration || '').trim(),
      money(e.dr),
      money(e.cr),
      money(e.balance),
    ]);
  });
  body.push([
    { content: 'TOTAL / CLOSING', colSpan: 4, styles: { fontStyle: 'bold' } },
    { content: money(totalDr), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: money(totalCr), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: money(closing), styles: { fontStyle: 'bold', halign: 'right' } },
  ]);

  autoTable(doc, {
    ...GRID,
    startY,
    head: [['Date', 'Type', 'Voucher', 'Particulars', 'Debit', 'Credit', 'Balance']],
    body,
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 22 },
      2: { cellWidth: 16 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 24 },
      6: { halign: 'right', cellWidth: 26 },
    },
    margin: { left: 8, right: 8, bottom: 12 },
  });

  footer(doc, `${records.length} entries`);
  return doc.output('bloburl');
}

// --- Balance sheet ---------------------------------------------------------

export async function buildBalanceSheetPdf(data) {
  const { records, summary, asAtDate } = data;
  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = await header(doc, 'BALANCE SHEET', null, periodLabel(null, null, asAtDate));

  // Debit balances are assets; credit balances are liabilities and equity.
  const assets = records.filter((r) => r.balance > 0);
  const liabilities = records.filter((r) => r.balance < 0);

  const section = (title, rows, total) => {
    const out = [
      [{ content: title, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [33, 43, 54], textColor: 255 } }],
    ];
    let group = null;
    rows.forEach((r) => {
      if (r.mainGroupName !== group) {
        group = r.mainGroupName;
        out.push([
          { content: group || '(no group)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [242, 244, 246] } },
        ]);
      }
      out.push([`${r.caCode}-${r.acCode}`, r.accountName || '', money(Math.abs(r.balance))]);
    });
    out.push([
      { content: `TOTAL ${title}`, colSpan: 2, styles: { fontStyle: 'bold' } },
      { content: money(total), styles: { fontStyle: 'bold', halign: 'right' } },
    ]);
    return out;
  };

  const body = [
    ...section('ASSETS', assets, summary.assets),
    [{ content: '', colSpan: 3, styles: { minCellHeight: 3 } }],
    ...section('LIABILITIES & EQUITY', liabilities, summary.liabilities),
    [
      { content: 'PROFIT FOR THE PERIOD', colSpan: 2, styles: { fontStyle: 'bold' } },
      { content: money(summary.profitForPeriod), styles: { fontStyle: 'bold', halign: 'right' } },
    ],
    [
      { content: 'TOTAL LIABILITIES, EQUITY & PROFIT', colSpan: 2, styles: { fontStyle: 'bold' } },
      {
        content: money(summary.liabilities + summary.profitForPeriod),
        styles: { fontStyle: 'bold', halign: 'right' },
      },
    ],
  ];

  autoTable(doc, {
    ...GRID,
    startY,
    head: [['Code', 'Account', 'Amount']],
    body,
    columnStyles: { 0: { cellWidth: 20 }, 2: { halign: 'right', cellWidth: 34 } },
    margin: { left: 8, right: 8, bottom: 12 },
  });

  const diff = summary.difference;
  footer(
    doc,
    Math.abs(diff) < 0.005
      ? 'Balanced'
      : `Out of balance by ${money(diff)} — from opening balances in the chart of accounts`
  );
  return doc.output('bloburl');
}

// --- Bank book -------------------------------------------------------------

export async function buildBankBookPdf(data) {
  const { account, records, opening, closing, totalIn, totalOut, fromDate, toDate } = data;
  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const who = `${account.caCode}-${account.acCode}  ${account.accountName}`;
  const startY = await header(doc, 'BANK BOOK', who, periodLabel(fromDate, toDate));

  const body = [
    [
      { content: 'Opening balance', colSpan: 5, styles: { fontStyle: 'bold' } },
      { content: '', styles: {} },
      { content: '', styles: {} },
      { content: money(opening), styles: { fontStyle: 'bold', halign: 'right' } },
    ],
  ];
  records.forEach((e) => {
    body.push([
      fDate(e.voucherDate),
      e.voucherType || '',
      String(e.voucherCode ?? ''),
      (e.chequeNo || '').trim(),
      (e.paidTo || e.narration || '').trim(),
      money(e.dr),
      money(e.cr),
      money(e.balance),
    ]);
  });
  body.push([
    { content: 'TOTAL / CLOSING', colSpan: 5, styles: { fontStyle: 'bold' } },
    { content: money(totalIn), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: money(totalOut), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: money(closing), styles: { fontStyle: 'bold', halign: 'right' } },
  ]);

  autoTable(doc, {
    ...GRID,
    startY,
    head: [['Date', 'Type', 'Voucher', 'Cheque', 'Particulars', 'Received', 'Paid', 'Balance']],
    body,
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 24 },
      2: { cellWidth: 16 },
      3: { cellWidth: 26 },
      5: { halign: 'right', cellWidth: 26 },
      6: { halign: 'right', cellWidth: 26 },
      7: { halign: 'right', cellWidth: 28 },
    },
    margin: { left: 8, right: 8, bottom: 12 },
  });

  footer(doc, `${records.length} entries`);
  return doc.output('bloburl');
}

export async function buildBankPositionPdf(data) {
  const { records, total, asAtDate } = data;
  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = await header(doc, 'BANK POSITION', null, periodLabel(null, null, asAtDate));

  const body = records.map((r) => [
    `${r.caCode}-${r.acCode}`,
    r.accountName || '',
    money(r.balance),
  ]);
  body.push([
    { content: 'TOTAL CASH & BANK', colSpan: 2, styles: { fontStyle: 'bold' } },
    { content: money(total), styles: { fontStyle: 'bold', halign: 'right' } },
  ]);

  autoTable(doc, {
    ...GRID,
    startY,
    head: [['Code', 'Bank / Cash Account', 'Balance']],
    body,
    columnStyles: { 0: { cellWidth: 22 }, 2: { halign: 'right', cellWidth: 40 } },
    margin: { left: 8, right: 8, bottom: 12 },
  });

  footer(doc, `${records.length} accounts`);
  return doc.output('bloburl');
}

// --- Receivables aging -----------------------------------------------------

export async function buildAgingPdf(data) {
  const { records, totals, buckets, asAtDate, side } = data;
  const payable = side === 'payable';
  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = await header(
    doc,
    payable ? 'PAYABLES AGING' : 'RECEIVABLES AGING',
    null,
    periodLabel(null, null, asAtDate)
  );

  const body = records.map((r) => [
    r.subDescription || '',
    String(r.openInvoices),
    money(r.balanceNet),
    money(r.bal0),
    money(r.bal1),
    money(r.bal2),
    money(r.bal3),
    money(r.balRest),
  ]);
  body.push([
    { content: 'TOTAL', styles: { fontStyle: 'bold' } },
    { content: String(totals.openInvoices), styles: { fontStyle: 'bold', halign: 'center' } },
    { content: money(totals.balanceNet), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: money(totals.bal0), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: money(totals.bal1), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: money(totals.bal2), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: money(totals.bal3), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: money(totals.balRest), styles: { fontStyle: 'bold', halign: 'right' } },
  ]);

  autoTable(doc, {
    ...GRID,
    startY,
    head: [
      [
        payable ? 'Supplier' : 'Customer',
        payable ? 'Bills' : 'Inv',
        'Outstanding',
        buckets.current,
        buckets.month1,
        buckets.month2,
        buckets.month3,
        buckets.older,
      ],
    ],
    body,
    columnStyles: {
      0: { cellWidth: 66 },
      1: { cellWidth: 12, halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
    margin: { left: 8, right: 8, bottom: 12 },
  });

  footer(
    doc,
    payable
      ? `${records.length} suppliers, ${totals.openInvoices} open bills`
      : `${records.length} customers, ${totals.openInvoices} open invoices`
  );
  return doc.output('bloburl');
}

export async function buildOutstandingPdf(data, partyName) {
  const { records, totals, asAtDate, side } = data;
  const payable = side === 'payable';
  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = await header(
    doc,
    payable ? 'OUTSTANDING BILLS' : 'OUTSTANDING INVOICES',
    partyName || null,
    periodLabel(null, null, asAtDate)
  );

  const body = records.map((r) => [
    fDate(r.voucherDate),
    String(r.voucherCode),
    partyName ? '' : r.subDescription || '',
    money(r.amount),
    money(r.paid),
    money(r.outstanding),
    String(r.daysOld),
  ]);
  body.push([
    { content: 'TOTAL', colSpan: 3, styles: { fontStyle: 'bold' } },
    { content: money(totals.amount), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: money(totals.paid), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: money(totals.outstanding), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: '', styles: {} },
  ]);

  autoTable(doc, {
    ...GRID,
    startY,
    head: [[
      'Date',
      payable ? 'Bill' : 'Invoice',
      payable ? 'Supplier' : 'Customer',
      'Billed',
      payable ? 'Paid' : 'Received',
      'Outstanding',
      'Days',
    ]],
    body,
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 16 },
      3: { halign: 'right', cellWidth: 24 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 26 },
      6: { halign: 'center', cellWidth: 12 },
    },
    margin: { left: 8, right: 8, bottom: 12 },
  });

  footer(doc, `${records.length} open ${payable ? 'bills' : 'invoices'}`);
  return doc.output('bloburl');
}
