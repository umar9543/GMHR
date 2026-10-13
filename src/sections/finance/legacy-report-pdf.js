import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { amt, code2, balanceSheet, profitAndLoss, scheduleOfNotes } from './financial-statements';

// ----------------------------------------------------------------------
// The finance reports printed the way the legacy system prints them, page
// for page: the same titles, columns, headings, totals and signs, so the
// accounts office can lay a new printout beside an old one.
// ----------------------------------------------------------------------

const COMPANY = 'GUARDS MARK SECURITY SERVICES (PVT) LTD.';
const COMPANY_TITLE = 'Guards Mark Security Services (Pvt) Ltd.';

const dmy = (v) => {
  if (!v) return '';
  const s = String(v).slice(0, 10);
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
};
const dmyShort = (v) => {
  const s = dmy(v);
  return s ? `${s.slice(0, 6)}${s.slice(8)}` : '';
};
const today = () => dmy(new Date().toISOString());

/** Whole numbers with separators; zero prints as 0. */
const int0 = (v) => Math.round(Number(v || 0)).toLocaleString('en-US');
/** Two decimals with separators. */
const dec2 = (v) =>
  Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// eslint-disable-next-line new-cap
const newDoc = (orientation = 'portrait') => new jsPDF({ orientation, unit: 'mm', format: 'a4' });

function pageNumbers(doc, fmt) {
  const pages = doc.internal.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal').setFontSize(8);
    fmt(doc, i, pages, w, h);
  }
}

// ================================================================ trial balance

/** Six columns: opening, movement and closing, by control heading. Landscape. */
export function buildTrialBalance6Pdf(data) {
  const doc = newDoc('landscape');
  const w = doc.internal.pageSize.getWidth();

  const groups = new Map();
  data.records.forEach((r) => {
    if (!groups.has(r.controlCode)) groups.set(r.controlCode, { name: r.controlName, rows: [] });
    groups.get(r.controlCode).rows.push(r);
  });

  const body = [];
  const sum = (rows, k) => rows.reduce((t, r) => t + Number(r[k] || 0), 0);
  [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([, g]) => {
      body.push([
        { content: g.name || '', colSpan: 8, styles: { fontStyle: 'bold', fontSize: 7.5 } },
      ]);
      g.rows.forEach((r) =>
        body.push([
          `      ${r.accountName}`,
          int0(r.openingDr),
          int0(r.openingCr),
          int0(r.periodDr),
          int0(r.periodCr),
          int0(r.closingDr),
          int0(r.closingCr),
          int0(r.closingDr - r.closingCr),
        ])
      );
      const keys = ['openingDr', 'openingCr', 'periodDr', 'periodCr', 'closingDr', 'closingCr'];
      body.push([
        { content: '', styles: { fontStyle: 'bold' } },
        ...keys.map((k) => ({ content: int0(sum(g.rows, k)), styles: { fontStyle: 'bold' } })),
        {
          content: int0(sum(g.rows, 'closingDr') - sum(g.rows, 'closingCr')),
          styles: { fontStyle: 'bold' },
        },
      ]);
    });
  const t = data.totals;
  body.push([
    { content: 'Grand Total:', styles: { fontStyle: 'bold' } },
    ...[t.openingDr, t.openingCr, t.periodDr, t.periodCr, t.closingDr, t.closingCr].map((v) => ({
      content: int0(v),
      styles: { fontStyle: 'bold' },
    })),
    { content: int0(t.closingDr - t.closingCr), styles: { fontStyle: 'bold' } },
  ]);

  const head = () => {
    doc.setFont('times', 'bold').setFontSize(15);
    doc.text(COMPANY, w / 2 - 20, 14, { align: 'center' });
    doc.setFontSize(13).text('Trial Balance', w / 2 - 20, 22, { align: 'center' });
    doc.setFontSize(8).text(`From ${dmy(data.fromDate)} To ${dmy(data.toDate)}`, w / 2 - 20, 27, {
      align: 'center',
    });
    doc
      .setFont('times', 'normal')
      .setFontSize(8)
      .text(`Print Date ${today()}`, w - 70, 16);
  };

  autoTable(doc, {
    startY: 30,
    margin: { top: 30, left: 8, right: 8, bottom: 12 },
    head: [
      [
        'DESCRIPTION',
        'OPEN  BAL\nDR',
        'OPEN BAL\nCR',
        'AMOUNT\nDR',
        'AMOUNT\nCR',
        'CLOSE BAL\nDR',
        'CLOSE BAL\nCR',
        'Clsoing\nBal',
      ],
    ],
    body,
    theme: 'plain',
    styles: { font: 'times', fontSize: 7, cellPadding: 0.9, halign: 'right' },
    headStyles: { fontStyle: 'bold', halign: 'center', lineWidth: { bottom: 0.4 }, lineColor: 0 },
    columnStyles: { 0: { halign: 'left', cellWidth: 70 } },
    didParseCell: (c) => {
      if (c.section === 'body' && c.row.raw.length === 8) {
        c.cell.styles.lineWidth = { bottom: 0.15 };
        c.cell.styles.lineColor = 0;
      }
    },
    didDrawPage: head,
  });
  pageNumbers(doc, (d, i, n, pw, ph) => d.text(String(i), pw / 2 + 60, ph - 6));
  return doc.output('bloburl');
}

/** Two columns: each account's closing as one figure, by control heading A-Z. Portrait. */
export function buildTrialBalance2Pdf(data) {
  const doc = newDoc('portrait');
  const w = doc.internal.pageSize.getWidth();

  const groups = new Map();
  data.records
    .filter((r) => Math.abs(Number(r.netClosing || 0)) >= 0.005)
    .forEach((r) => {
      const key = (r.controlName || '').trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });

  const body = [];
  [...groups.keys()].sort().forEach((name) => {
    const rows = groups
      .get(name)
      .sort((a, b) => (a.accountName || '').localeCompare(b.accountName || ''));
    body.push([
      {
        content: name,
        colSpan: 3,
        styles: { fontStyle: 'bold', cellPadding: { top: 4, bottom: 3 } },
      },
    ]);
    rows.forEach((r) => {
      const n = Number(r.netClosing);
      body.push([r.accountName, n > 0 ? dec2(n) : '', n < 0 ? dec2(-n) : '']);
    });
    const dr = rows.filter((r) => r.netClosing > 0).reduce((t, r) => t + Number(r.netClosing), 0);
    const cr = rows.filter((r) => r.netClosing < 0).reduce((t, r) => t - Number(r.netClosing), 0);
    body.push([
      { content: '* * * Sub Total', styles: { fontStyle: 'bold' } },
      { content: dr ? dec2(dr) : '', styles: { fontStyle: 'bold' } },
      { content: cr ? dec2(cr) : '', styles: { fontStyle: 'bold' } },
    ]);
  });
  body.push([
    { content: '* * * Grand Total', styles: { fontStyle: 'bold' } },
    { content: dec2(data.totals.netDr), styles: { fontStyle: 'bold' } },
    { content: dec2(data.totals.netCr), styles: { fontStyle: 'bold' } },
  ]);

  autoTable(doc, {
    startY: 36,
    margin: { top: 36, left: 14, right: 14, bottom: 12 },
    head: [['Account', 'Debit', 'Credit']],
    body,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 0.7 },
    headStyles: { fontStyle: 'bold', lineWidth: { top: 0.1, bottom: 0.1 }, lineColor: 150 },
    columnStyles: { 1: { halign: 'right', cellWidth: 40 }, 2: { halign: 'right', cellWidth: 40 } },
    didParseCell: (c) => {
      if (c.section === 'head' && c.column.index > 0) c.cell.styles.halign = 'right';
      if (c.section === 'body' && c.row.raw.length === 3 && typeof c.row.raw[0] === 'string') {
        c.cell.styles.lineWidth = { bottom: 0.1 };
        c.cell.styles.lineColor = 200;
      }
    },
    didDrawPage: () => {
      doc.setFont('helvetica', 'normal').setFontSize(8);
      doc.text(`Run Date:      ${today()}`, 14, 10);
      doc
        .setFont('helvetica', 'bold')
        .setFontSize(14)
        .text(COMPANY, w / 2, 20, { align: 'center' });
      doc
        .setFontSize(8)
        .text(`Trial Balance As On ${dmy(data.toDate)}`, w / 2, 26, { align: 'center' });
    },
  });
  pageNumbers(doc, (d, i, n, pw) => d.text(`Page No:        ${i}`, pw - 40, 10));
  return doc.output('bloburl');
}

// ================================================================ statements

/** The two-line legacy title: company in Times, report name in Helvetica bold. */
function statementTitle(doc, title) {
  const w = doc.internal.pageSize.getWidth();
  doc
    .setFont('times', 'normal')
    .setFontSize(18)
    .text(COMPANY_TITLE, w / 2, 14, { align: 'center' });
  doc
    .setFont('helvetica', 'bold')
    .setFontSize(11)
    .text(title, w / 2, 19.5, { align: 'center' });
}

function underlined(doc, text, x, y, size = 8.5) {
  doc.setFont('helvetica', 'bolditalic').setFontSize(size).text(text, x, y);
  doc.setLineWidth(0.25).line(x, y + 0.7, x + doc.getTextWidth(text), y + 0.7);
}

export function buildBalanceSheetLegacyPdf(data) {
  const doc = newDoc('portrait');
  const bs = balanceSheet(data);
  const title = `BALANCE SHEET AS AT ${dmy(data.asAtDate)}`;
  statementTitle(doc, title);
  const X = { label: 22, code: 108, note: 152, amtR: 192, totR: 194 };
  let y = 30;
  const page = (need) => {
    if (y + need > 285) {
      doc.addPage();
      statementTitle(doc, title);
      y = 30;
    }
  };

  const section = (m, headingText) => {
    page(16 + m.groups.length * 6);
    doc.setFont('helvetica', 'bold').setFontSize(8).text(code2(m.note), 8, y);
    y += 4;
    if (headingText) {
      underlined(doc, headingText, 13, y);
      y += 4;
    }
    underlined(doc, m.name, 13, y);
    y += 4;
    const top = y - 3;
    m.groups.forEach((g) => {
      doc.setFont('helvetica', 'normal').setFontSize(7.5);
      doc.text(g.name || '', X.label, y);
      doc.text(code2(g.code), X.code, y);
      doc.text(String(m.note), X.note, y, { align: 'right' });
      doc.text(amt(g.total), X.amtR, y + 1, { align: 'right' });
      y += 5;
    });
    doc.setLineWidth(0.2).rect(X.note + 2, top, X.amtR - X.note - 1, y - top - 2.5);
    y += 3;
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(7.5)
      .text(amt(m.total), X.amtR, y, { align: 'right' });
    y += 5;
  };

  bs.assets.forEach((m, i) => section(m, i === 0 ? 'ASSETS' : null));
  page(12);
  doc.setFont('helvetica', 'bold').setFontSize(8).text('CURRENT ASSETS', 18, y);
  doc.setLineWidth(0.2).line(150, y + 1, X.amtR, y + 1);
  y += 4;
  doc.setFont('times', 'bold').setFontSize(8).text('TOTAL ASSETS', 20, y);
  doc.setFont('helvetica', 'bold').text(amt(bs.totalAssets), X.amtR, y, { align: 'right' });
  doc.line(150, y + 1.5, X.amtR, y + 1.5);
  y += 9;

  bs.sides.forEach((m) => {
    section(m, null);
    page(8);
    doc.setLineWidth(0.25).line(150, y - 3, X.totR, y - 3);
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(7.5)
      .text(amt(m.running), X.totR, y + 0.5, { align: 'right' });
    doc.line(150, y + 2, X.totR, y + 2);
    y += 8;
  });

  pageNumbers(doc, (d, i, n, pw, ph) => d.text(String(i), pw - 30, ph - 8));
  return doc.output('bloburl');
}

export function buildProfitLossPdf(data) {
  const doc = newDoc('portrait');
  const pl = profitAndLoss(data);
  statementTitle(doc, `PROFIT AND LOSS ACCOUNT FOR THE YEAR ENDED ${dmy(data.asAtDate)}`);
  const X = { label: 22, note: 152, amtR: 196 };
  let y = 28;
  pl.rows.forEach((r) => {
    if (r.kind === 'heading') {
      doc.setFont('helvetica', 'bold').setFontSize(8);
      const t = ` ${r.label} `;
      doc.text(t, 13, y);
      doc.setLineWidth(0.25).line(13, y + 0.7, 13 + doc.getTextWidth(t), y + 0.7);
      y += 5;
    } else if (r.kind === 'line') {
      doc.setFont('helvetica', 'normal').setFontSize(7.5);
      doc.text(r.label || '', X.label, y);
      doc.text(String(r.note), X.note, y + 0.5, { align: 'right' });
      doc.text(amt(r.amount), X.amtR, y + 0.5, { align: 'right' });
      y += 5;
    } else if (r.kind === 'gross') {
      doc.setLineWidth(0.25).line(168, y - 3, X.amtR, y - 3);
      doc.setFont('times', 'normal').setFontSize(8).text(r.label, X.label, y);
      doc
        .setFont('helvetica', 'normal')
        .setFontSize(7.5)
        .text(amt(r.amount), X.amtR, y + 1, { align: 'right' });
      y += 6;
    }
  });
  y += 3;
  doc.setLineWidth(0.3).line(158, y - 3, X.amtR, y - 3);
  doc.setFont('helvetica', 'bold').setFontSize(8).text('OPERATING PROFIT', X.label, y);
  doc.text(amt(pl.profit), X.amtR, y, { align: 'right' });
  doc.line(158, y + 1.5, X.amtR, y + 1.5);
  pageNumbers(doc, (d, i, n, pw, ph) => d.text(String(i), pw - 30, ph - 8));
  return doc.output('bloburl');
}

export function buildNotesPdf(data) {
  const doc = newDoc('portrait');
  const blocks = scheduleOfNotes(data);
  const title = `SCHEDULE OF NOTES AS AT ${dmy(data.asAtDate)}`;
  statementTitle(doc, title);
  const X = { code: 26, label: 26, amtR: 182, line1: 150 };
  let y = 28;
  const page = (need) => {
    if (y + need > 284) {
      doc.addPage();
      statementTitle(doc, title);
      y = 28;
    }
  };
  const heading = (note, name, firstLines = 1) => {
    page(14 + firstLines * 5.5 + 9);
    doc.setFont('times', 'bold').setFontSize(8.5).text(String(note), 13, y);
    const t = ` ${name} `;
    doc.text(t, 17, y);
    doc.setLineWidth(0.25).line(17, y + 0.7, 17 + doc.getTextWidth(t), y + 0.7);
    y += 6;
  };

  blocks.forEach((b) => {
    if (b.isProfit) {
      heading(b.note, b.name);
      doc
        .setFont('helvetica', 'normal')
        .setFontSize(8.5)
        .text('Net Profit for the Year', X.label, y);
      doc.setFont('times', 'normal').text(amt(b.profit), X.amtR, y + 1, { align: 'right' });
      y += 10;
      return;
    }
    heading(b.note, b.name, b.groups[0]?.subs.length || 1);
    b.groups.forEach((g) => {
      page(8 + g.subs.length * 5.5);
      g.subs.forEach((s) => {
        doc
          .setFont('helvetica', 'normal')
          .setFontSize(8.5)
          .text(s.name || '', X.label, y);
        doc.setFont('times', 'normal').text(amt(s.amount), X.amtR, y + 1, { align: 'right' });
        y += 5.5;
      });
      doc.setLineWidth(0.25).line(X.line1, y - 3, X.amtR, y - 3);
      doc
        .setFont('times', 'normal')
        .setFontSize(8)
        .text(code2(g.code), 13, y + 0.5);
      doc
        .setFont('helvetica', 'bold')
        .setFontSize(7)
        .text(g.name || '', X.label, y);
      doc
        .setFont('times', 'bold')
        .setFontSize(8.5)
        .text(amt(g.total), X.amtR, y + 1, { align: 'right' });
      doc.line(X.line1, y + 2.5, X.amtR, y + 2.5);
      y += 9;
    });
    y += 4;
  });
  pageNumbers(doc, (d, i, n, pw, ph) => d.text(String(i), pw - 40, ph - 8));
  return doc.output('bloburl');
}

// ================================================================ bank reports

export function buildBankPositionPdf(data) {
  const doc = newDoc('portrait');
  const w = doc.internal.pageSize.getWidth();
  doc
    .setFont('times', 'bold')
    .setFontSize(14)
    .text('Bank Position', w / 2, 12, { align: 'center' });
  doc.setFont('times', 'normal').setFontSize(8);
  doc.text(`From ${dmy(data.fromDate)} To ${dmy(data.toDate)}`, w / 2, 16, { align: 'center' });
  doc.text(today(), w - 18, 12, { align: 'right' });

  const t = data.totals;
  autoTable(doc, {
    startY: 21,
    margin: { left: 6, right: 6 },
    head: [
      [
        { content: 'Bank A/c\nCode', colSpan: 2 },
        { content: 'Bank Name', rowSpan: 2 },
        { content: 'Opening\nBalance', rowSpan: 2 },
        { content: 'Activity', colSpan: 2 },
        { content: 'Closing\nBalance', rowSpan: 2 },
      ],
      ['', '', 'Receipts', 'Payments'],
    ],
    body: [
      ...data.banks.map((b) => [
        b.caCode,
        b.acCode,
        b.bankName,
        dec2(b.opening),
        b.receipts ? dec2(b.receipts) : '',
        dec2(b.payments),
        dec2(b.closing),
      ]),
      [
        '',
        '',
        '',
        { content: dec2(t.opening), styles: { fontStyle: 'bold' } },
        { content: dec2(t.receipts), styles: { fontStyle: 'bold' } },
        { content: dec2(t.payments), styles: { fontStyle: 'bold' } },
        { content: dec2(t.closing), styles: { fontStyle: 'bold' } },
      ],
    ],
    theme: 'plain',
    styles: { font: 'times', fontSize: 8, cellPadding: 0.6 },
    headStyles: { fontStyle: 'bold', halign: 'center', lineWidth: 0.2, lineColor: 0 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 8, halign: 'center' },
      2: { cellWidth: 82 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
  });

  const detail = (title, rows, total) => {
    const y = doc.lastAutoTable.finalY + 12;
    doc
      .setFont('times', 'bold')
      .setFontSize(8)
      .text(title, w / 2, y - 2, { align: 'center' });
    autoTable(doc, {
      startY: y,
      margin: { left: 6, right: 6 },
      head: [
        ['Date', 'Party Name / Title of A/c', 'V.No.', 'Chq No.', 'Amount', 'A/c Code', 'Bank'],
      ],
      body: [
        ...rows.map((r) => [
          dmyShort(r.voucherDate),
          r.partyName,
          r.voucherCode,
          r.chequeNo || '',
          dec2(r.amount),
          `${r.caCode}  ${r.acCode}  ${r.subCode}`,
          r.bankName || '',
        ]),
        ['', '', '', '', { content: dec2(total), styles: { fontStyle: 'bold' } }, '', ''],
      ],
      theme: 'plain',
      styles: { font: 'times', fontSize: 7, cellPadding: 0.5 },
      headStyles: {
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        lineWidth: 0.2,
        lineColor: 0,
      },
      columnStyles: {
        0: { cellWidth: 16, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: 20, halign: 'center' },
      },
    });
  };
  detail('Receipt Detail', data.receipts, t.receiptDetail);
  detail('Payment Detail', data.payments, t.paymentDetail);

  let y = doc.lastAutoTable.finalY + 12;
  if (y > 270) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('times', 'normal').setFontSize(8);
  [
    ['Prepared By', 25],
    ['Checked By', 90],
    ['Reviewed By', 160],
  ].forEach(([label, x]) => {
    doc.setLineWidth(0.3).rect(x, y, 34, 11);
    doc.text(label, x + 17, y + 8, { align: 'center' });
  });
  pageNumbers(doc, (d, i, n, pw, ph) => d.text(String(i), pw / 2 + 40, ph - 6));
  return doc.output('bloburl');
}

export function buildBankBookLegacyPdf(data) {
  const doc = newDoc('portrait');
  const w = doc.internal.pageSize.getWidth();
  const body = [
    [
      '',
      { content: '* * * Brought Forward', styles: { fontStyle: 'bold', fontSize: 8.5 } },
      '',
      '',
      '',
      '',
      '',
      { content: dec2(data.opening), styles: { fontStyle: 'bold' } },
    ],
    ...data.records.map((r) => [
      dmy(r.voucherDate),
      r.narration || '',
      r.chequeNo || '',
      r.typeName || '',
      `: ${String(r.voucherCode).padStart(6, '0')}`,
      r.deposit ? dec2(r.deposit) : '',
      r.drawn ? dec2(r.drawn) : '',
      dec2(r.balance),
    ]),
  ];
  autoTable(doc, {
    startY: 34,
    margin: { top: 34, left: 8, right: 8, bottom: 14 },
    head: [['V / DATE', 'PARTICULARS', 'CHQ.NO.', 'TYPE', 'VCODE', 'DEPOSITE', 'DRAWN', 'BALANCE']],
    body,
    foot: [
      [
        '',
        {
          content: `* * * ${data.closing >= 0 ? 'Debit' : 'Credit'} Balance`,
          colSpan: 4,
          styles: { halign: 'left' },
        },
        dec2(data.totalDeposit),
        dec2(data.totalDrawn),
        dec2(data.closing),
      ],
    ],
    theme: 'grid',
    styles: {
      font: 'times',
      fontSize: 6.5,
      cellPadding: 1,
      lineColor: 0,
      lineWidth: 0.2,
      valign: 'top',
    },
    headStyles: {
      fillColor: [200, 200, 200],
      textColor: 0,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    footStyles: {
      fillColor: 255,
      textColor: 0,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'right',
      lineWidth: 0,
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 46 },
      2: { cellWidth: 18 },
      3: { cellWidth: 22 },
      4: { cellWidth: 16 },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
    didDrawPage: () => {
      doc.setFont('times', 'normal').setFontSize(8).text(`Run Date:        ${today()}`, 14, 9);
      doc
        .setFont('times', 'bold')
        .setFontSize(16)
        .text(COMPANY, w / 2, 16, { align: 'center' });
      doc
        .setFontSize(8)
        .text(`Bank Book From ${dmy(data.fromDate)} To ${dmy(data.toDate)}`, w / 2, 21, {
          align: 'center',
        });
      doc
        .setFont('helvetica', 'bold')
        .setFontSize(8)
        .text(data.accountName || '', 10, 29);
    },
  });
  pageNumbers(doc, (d, i, n, pw) => d.text(`Page No:${i}`, pw - 30, 9));
  return doc.output('bloburl');
}

// ================================================================ deductions

export function buildDeductionPdf(data) {
  const doc = newDoc('landscape');
  const w = doc.internal.pageSize.getWidth();
  const t = data.totals;

  const body = [];
  let sl = 0;
  let province = null;
  data.records.forEach((r) => {
    if (r.province !== province) {
      province = r.province;
      if (sl) body.push([{ content: '', colSpan: 21 }]);
      body.push([
        {
          content: province,
          colSpan: 21,
          styles: { fillColor: [210, 210, 210], fontStyle: 'bold', halign: 'center', fontSize: 8 },
        },
      ]);
    }
    sl += 1;
    body.push([
      sl,
      dmy(r.invoiceDate),
      r.invoiceNo,
      dmyShort(r.createdDate),
      r.receiptNo,
      r.primaryAccount || '',
      r.secondaryAccount || '',
      r.narration || '',
      int0(r.invoiceAmount),
      int0(r.salesTax),
      int0(r.totalInvoice),
      r.chequeNo || '',
      int0(r.chequeAmount),
      int0(r.otherDeduction),
      int0(r.whtTax),
      `${Math.round(r.salesTaxDeductedPct)}%`,
      int0(r.salesTaxDeducted),
      `${100 - Math.round(r.salesTaxDeductedPct)}%`,
      int0(r.salesTaxReceived),
      int0(r.netAfterSalesTax),
      '0.00',
    ]);
  });
  body.push([
    ...Array(8).fill(''),
    int0(t.invoiceAmount),
    dec2(t.salesTax),
    int0(t.totalInvoice),
    '',
    int0(t.chequeAmount),
    int0(t.otherDeduction),
    int0(t.whtTax),
    '',
    int0(t.salesTaxDeducted),
    '',
    dec2(t.salesTaxReceived),
    int0(t.netAfterSalesTax),
    '0.00',
  ]);

  autoTable(doc, {
    startY: 30,
    margin: { top: 30, left: 6, right: 6, bottom: 12 },
    head: [
      [
        'S. No.',
        'Inv Date',
        'Inv #',
        'Cre\nDate',
        'Rcpt #',
        'Primary A/c',
        'Secondary A/c',
        'Invoice\nNarration',
        'Invocie\nAmt',
        'Sales\nTax',
        'Total\nInvoice',
        'Chq #',
        'Chq\nAmount',
        'Other\nDeduct',
        'wht Tax\nDed',
        { content: 'Sales Tax\nDed', colSpan: 2 },
        { content: 'Sales Tax\nReceived', colSpan: 2 },
        'Net Amount\nafter sales\ntax',
        'Sales Tax\nPaid',
      ],
    ],
    body,
    theme: 'grid',
    styles: {
      font: 'times',
      fontSize: 6.3,
      cellPadding: 0.7,
      lineColor: 0,
      lineWidth: 0.15,
      halign: 'right',
    },
    headStyles: {
      fillColor: 255,
      textColor: 0,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'top',
      fontSize: 6.5,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      1: { halign: 'center', cellWidth: 15 },
      2: { halign: 'center', cellWidth: 10 },
      3: { halign: 'center', cellWidth: 11 },
      4: { halign: 'center', cellWidth: 9 },
      5: { halign: 'left', cellWidth: 20, overflow: 'ellipsize' },
      6: { halign: 'left', cellWidth: 18, overflow: 'ellipsize' },
      7: { halign: 'left', cellWidth: 20, overflow: 'ellipsize' },
      11: { halign: 'center', cellWidth: 13 },
      15: { cellWidth: 7, halign: 'left' },
      17: { cellWidth: 7, halign: 'left' },
    },
    didDrawPage: () => {
      doc
        .setFont('times', 'bold')
        .setFontSize(13)
        .text('Deduction report (TAX & MISC)', w / 2, 13, { align: 'center' });
      doc.setFont('times', 'normal').setFontSize(8);
      doc.text(today(), w - 12, 11, { align: 'right' });
      doc.text(`FROM ${dmy(data.fromDate)} To ${dmy(data.toDate)}`, w / 2, 22, { align: 'center' });
    },
  });

  let y = doc.lastAutoTable.finalY + 8;
  if (y > 150) {
    doc.addPage();
    y = 30;
  }
  autoTable(doc, {
    startY: y,
    margin: { left: 8 },
    tableWidth: 110,
    body: [
      ['Invocie Amt', int0(t.invoiceAmount)],
      ['Sales Tax', int0(t.salesTax)],
      ['Total Invoice', int0(t.totalInvoice)],
      ['Chq Amount', int0(t.chequeAmount)],
      ['Other Deductions', int0(t.otherDeduction)],
      ['wht Tax Ded', int0(t.whtTax)],
      ['Sales Tax Ded', int0(t.salesTaxDeducted)],
      ['Sales Tax Received', int0(t.salesTaxReceived)],
      ['Net Amount after sales tax', int0(t.netAfterSalesTax)],
      ['Total Sales Tax Paid', '0'],
      ['Sales Tax Balance', int0(t.salesTaxReceived)],
    ],
    theme: 'grid',
    styles: { font: 'times', fontSize: 7, cellPadding: 1, lineColor: 0, lineWidth: 0.15 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 }, 1: { halign: 'right' } },
  });
  pageNumbers(doc, (d, i, n, pw) => d.text(`Page ${i} of ${n}`, pw - 12, 16, { align: 'right' }));
  return doc.output('bloburl');
}
