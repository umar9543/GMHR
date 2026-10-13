// eslint-disable-next-line new-cap -- jsPDF is the library's own exported name
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { fbrQrDataUrl } from './fbr-qr';

// ----------------------------------------------------------------------
// The Sales Tax Invoice, in the two forms the office sends out:
//
//   'letterhead'  the soft copy, with the company masthead printed on it
//   'plain'       the hard copy, for the pre-printed letterhead paper
//
// Only the top of the page differs; everything below it is the same voucher.
// ----------------------------------------------------------------------

const COMPANY = 'GUARDS MARK';
const COMPANY_SUB = 'SECURITY SERVICES (PVT.) LTD.';
const EMAIL = 'info@guardsmark.pk';
const WEBSITE = 'www.guardsmark.pk';
const ADDRESS =
  'Plot# C-1-C, Mezzanine Floor, Lane-1, Sehar Commercial, Phase-7, D.H.A, Karachi, Pakistan.';

// The company's own registration, which every voucher carries.
const NTN_NO = '1560306-7';

// The sales tax registration the invoice quotes depends on the province that
// collects the tax: Sindh's authority knows the company as S1560306-7, the
// others by the plain NTN, and each calls the number by its own name.
const TAX_REGISTRATION = {
  sindh: { label: 'SNTN', number: 'S1560306-7' },
  panjab: { label: 'PNTN', number: NTN_NO },
  punjab: { label: 'PNTN', number: NTN_NO },
  balochistan: { label: 'BNTN', number: NTN_NO },
  ict: { label: 'STRN', number: NTN_NO },
};

const registrationFor = (province) =>
  TAX_REGISTRATION[String(province ?? '').trim().toLowerCase()] ?? { label: 'STRN', number: NTN_NO };

const footerNotes = (registration) => [
  'Please issue cross cheque in favour of "Guards Mark Security Services (Pvt.)Ltd."',
  'Please provide previous Tax challans bills if any.',
  'For Online payment IBAN #. PK18 SCBL-0000-0011-6002-3601 Standard Chartered Bank Ltd.',
  `${registration.label}      ${registration.number}`,
  `NTN No. ${NTN_NO}`,
];

const PAYABLE_TO = [
  'Make All Cheque Payable to',
  '"Guards Mark Security Services (Pvt.) Ltd"',
];

// The strip that closes the printed letterhead.
const SERVICES = [
  'Guarding',
  'Executive Protection',
  'Security Escorts',
  'Brand Protection',
  'Security Trainings',
];

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Whole rupees, the way the voucher has always printed them.
const money = (v) => Math.round(num(v)).toLocaleString('en-US');

const asDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** 31-Aug-26, the way the voucher writes a date. */
const shortDate = (value) => {
  const d = asDate(value);
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${String(
    d.getFullYear()
  ).slice(2)}`;
};

const longDate = (value) => {
  const d = asDate(value);
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};

const slashDate = (value) => {
  const d = asDate(value);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** The customer's code as the legacy voucher prints it: 13 + 195 + 1 = 131951. */
const customerId = (invoice) => {
  if (!invoice) return '';
  const { caCode, acCode, subCode } = invoice;
  if (caCode == null || acCode == null) return '';
  return `${caCode}${String(acCode).padStart(3, '0')}${subCode ?? 0}`;
};

// ----------------------------------------------------------------------
// The amount in words, which the voucher prints above the totals.

const ONES = [
  '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
  'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN',
  'EIGHTEEN', 'NINETEEN',
];
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

function underThousand(n) {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) {
    const rest = n % 10;
    return `${TENS[Math.floor(n / 10)]}${rest ? ` ${ONES[rest]}` : ''}`;
  }
  const rest = n % 100;
  return `${ONES[Math.floor(n / 100)]} HUNDRED${rest ? ` ${underThousand(rest)}` : ''}`;
}

/**
 * Thousands and millions, not lacs and crores: 814,739 reads "EIGHT HUNDRED
 * FOURTEEN THOUSAND SEVEN HUNDRED THIRTY NINE", which is how their vouchers
 * have always read.
 */
export function amountInWords(value) {
  const whole = Math.floor(Math.abs(num(value)));
  if (whole === 0) return 'ZERO ONLY';

  const parts = [];
  const billion = Math.floor(whole / 1000000000);
  const million = Math.floor((whole % 1000000000) / 1000000);
  const thousand = Math.floor((whole % 1000000) / 1000);
  const rest = whole % 1000;

  if (billion) parts.push(`${underThousand(billion)} BILLION`);
  if (million) parts.push(`${underThousand(million)} MILLION`);
  if (thousand) parts.push(`${underThousand(thousand)} THOUSAND`);
  if (rest) parts.push(underThousand(rest));

  return `${parts.join(' ')} ONLY`;
}

// ----------------------------------------------------------------------

// The letterhead's pieces: the shield on its own (the name beside it is set
// as type, as the legacy letterhead has it), and the three accreditations in
// the order they stand on the right - ASIS, APSAA, ISO 9001.
const SHIELD = '/assets/images/invoice-shield.png';
const BADGES = [
  '/assets/images/invoice-asis.png',
  '/assets/images/invoice-apsaa.png',
  '/assets/images/invoice-iso.png',
];

// FBR's Digital Invoicing logo, printed beside the QR code on a reported
// invoice. FBR supplies the artwork; until it is put here, the box is lettered.
const FBR_LOGO = '/assets/images/fbr-di-logo.png';

async function loadImage(path) {
  try {
    const res = await fetch(path);
    // A missing file can come back as the app's own page, with a 200.
    if (!res.ok || !(res.headers.get('content-type') || '').startsWith('image/')) return null;
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
 * The masthead, laid out as the legacy letterhead: the shield with GUARDS MARK
 * beside it in large bold type, underlined, and SECURITY SERVICES (PVT.) LTD.
 * spaced out beneath; the email and website in the middle; the accreditations
 * at the right.
 *
 * The type is sized from the legacy letterhead itself (measured at 0.150 mm a
 * pixel across the 182 mm between the margins): GUARDS MARK 17.4 pt bold set
 * 49.6 mm wide, SECURITY SERVICES 8.3 pt bold set 52.5 mm wide, the contact
 * lines 8.5 pt set 31 mm wide. The shield stands 18 mm tall and the three
 * accreditations smaller, each at its height on the letterhead, all centred
 * on the same line.
 */
const MASTHEAD = {
  top: 8,
  shieldHeight: 18,
  // The shield is drawn a little wider than the artwork, as on the letterhead.
  shieldWiden: 1.15,
  // ASIS, APSAA, ISO 9001 - their heights on the letterhead (69, 74 and 83 px).
  badgeHeights: [10.4, 11.1, 12.5],
  // Where the badges' middles line up, measured from the top of the shield.
  badgeMiddle: 8.4,
  // GUARDS MARK's capitals start this far below the top of the shield, and the
  // contact lines sit on these baselines - all as on the letterhead.
  nameTop: 3.46,
  contactBaselines: [6.9, 10.5],
  name: { size: 17.4, width: 49.6 },
  sub: { size: 8.3, width: 52.5 },
  contact: { size: 8.5, lineGap: 3.6, widths: [31.1, 30.5] },
  // From the rule down to the SECURITY SERVICES capitals.
  subGap: 1.35,
  rule: { below: 1.25, thickness: 0.85 },
  gaps: { afterShield: 1.2, beforeContact: 4, afterContact: 4, betweenBadges: 2.5 },
};

/** Writes `text` letter-spaced so it spans exactly `width` mm. */
function spacedText(doc, text, x, y, width) {
  const natural = doc.getTextWidth(text);
  const spacing = text.length > 1 ? Math.max(0, (width - natural) / (text.length - 1)) : 0;
  doc.setCharSpace(spacing);
  doc.text(text, x, y);
  doc.setCharSpace(0);
  return natural + spacing * (text.length - 1);
}

function drawLetterhead(doc, { shield, badges }, margin, pageWidth) {
  const { top, gaps } = MASTHEAD;

  const aspect = (image, widen = 1) => {
    if (!image) return 0;
    try {
      const props = doc.getImageProperties(image);
      return (props.width / props.height) * widen;
    } catch {
      return 0;
    }
  };

  const band = MASTHEAD.shieldHeight;
  const typeWidth = Math.max(MASTHEAD.name.width, MASTHEAD.sub.width);

  // --------------------------------------------------------- shield and name
  let x = margin;
  const shieldAspect = aspect(shield, MASTHEAD.shieldWiden);
  if (shieldAspect) {
    try {
      const width = shieldAspect * band;
      doc.addImage(shield, 'PNG', margin, top, width, band);
      x = margin + width + gaps.afterShield;
    } catch {
      /* the name stands on its own without the shield */
    }
  }

  const capHeight = (size) => size * 0.3528 * 0.716; // mm of a Helvetica capital
  const nameBaseline = top + MASTHEAD.nameTop + capHeight(MASTHEAD.name.size);

  doc.setTextColor(0, 0, 0).setFont('helvetica', 'bold').setFontSize(MASTHEAD.name.size);
  const nameWidth = spacedText(doc, COMPANY, x, nameBaseline, MASTHEAD.name.width);

  const ruleY = nameBaseline + MASTHEAD.rule.below;
  doc.setDrawColor(0, 0, 0).setLineWidth(MASTHEAD.rule.thickness);
  doc.line(x, ruleY, x + nameWidth + 0.6, ruleY);

  const subBaseline = ruleY + MASTHEAD.subGap + capHeight(MASTHEAD.sub.size);
  doc.setFont('helvetica', 'bold').setFontSize(MASTHEAD.sub.size);
  spacedText(doc, COMPANY_SUB, x, subBaseline, MASTHEAD.sub.width);

  const typeRight = x + typeWidth;

  // ------------------------------------------------------ the accreditations
  // From the right margin inwards, each at its own letterhead height, middles
  // on one line, so they keep their order (ASIS, APSAA, ISO).
  let badgeLeft = pageWidth - margin;
  badges
    .map((badge, i) => ({ badge, ratio: aspect(badge), height: MASTHEAD.badgeHeights[i] }))
    .filter((b) => b.ratio)
    .reverse()
    .forEach(({ badge, ratio, height }, i) => {
      const width = ratio * height;
      if (i > 0) badgeLeft -= gaps.betweenBadges;
      badgeLeft -= width;
      try {
        doc.addImage(badge, 'PNG', badgeLeft, top + MASTHEAD.badgeMiddle - height / 2, width, height);
      } catch {
        /* a badge that will not load is left out, not a hole */
      }
    });

  // ---------------------------------------------------- contact, in between
  // Set wide, as the letterhead sets them, centred in the gap.
  const middle = (typeRight + badgeLeft) / 2;
  doc.setFont('helvetica', 'normal').setFontSize(MASTHEAD.contact.size);
  [EMAIL, WEBSITE].forEach((line, i) => {
    const width = MASTHEAD.contact.widths[i];
    spacedText(doc, line, middle - width / 2, top + MASTHEAD.contactBaselines[i], width);
  });

  return mastheadBottom();
}

/** Where the masthead ends - the same on both copies, drawn or left blank. */
function mastheadBottom() {
  return MASTHEAD.top + MASTHEAD.shieldHeight + 6;
}

/**
 * The contact details and the services strip, which only the soft copy
 * carries - the printed stationery has them on the paper already.
 */
function drawPageFooter(doc, margin, pageWidth, pageHeight) {
  const bandHeight = 7;
  const bandY = pageHeight - 12 - bandHeight;

  // Email and website are in the masthead; the foot carries the address.
  doc.setFont('helvetica', 'normal').setFontSize(7.5);
  doc.text(ADDRESS, pageWidth / 2, bandY - 4, { align: 'center' });

  doc.setFillColor(23, 42, 76);
  doc.rect(margin - 2, bandY, pageWidth - margin * 2 + 4, bandHeight, 'F');

  doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(8);
  doc.text(SERVICES.join('   •   '), pageWidth / 2, bandY + 4.8, { align: 'center' });
  doc.setTextColor(0, 0, 0);
}

// What drawSignatures occupies from its first line to its last, which is
// what keeps it clear of the footer.
const SIGNATURES_HEIGHT = 27;

/**
 * Who prepared the voucher and who passed it, as the printed one carries it.
 */
function drawSignatures(doc, margin, pageWidth, startY) {
  const width = (pageWidth - margin * 2) / 3;
  const columns = ['Seal & Stamp', 'Prepared By :', 'Supervised By :'];

  doc.setFont('helvetica', 'normal').setFontSize(8.5);
  columns.forEach((text, i) => {
    doc.text(text, margin + width * i + width / 2, startY, { align: 'center' });
  });

  // Room to sign, then the rule to sign on.
  const ruleY = startY + 14;
  doc.setLineWidth(0.2);
  columns.forEach((_, i) => {
    const centre = margin + width * i + width / 2;
    doc.line(centre - width / 2 + 6, ruleY, centre + width / 2 - 6, ruleY);
  });

  doc.setFontSize(8);
  doc.text('FOR  "Guards Mark Security Pvt. Ltd."', margin + width / 2, ruleY + 4.5, {
    align: 'center',
  });

  doc.setFont('helvetica', 'bold').setFontSize(9);
  doc.text('Thank You for Your Business', pageWidth / 2, ruleY + 13, { align: 'center' });
}

/**
 * Builds the invoice and returns a blob URL.
 *
 * `format` is 'letterhead' for the soft copy or 'plain' for the printed one.
 * `fbr` is the invoice's live FBR report ({ fbrInvoiceNumber }), when it has
 * one: its number goes in the company's box, and FBR's QR code and the
 * Digital Invoicing logo beside the notes.
 */
export async function buildSalesTaxInvoicePdf(invoice, { format = 'letterhead', fbr = null } = {}) {
  // eslint-disable-next-line new-cap -- jsPDF is the library's own exported name
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const right = pageWidth - margin;

  // Only the soft copy carries the masthead. The plain copy is printed on the
  // pre-printed letterhead, so it leaves the masthead's space empty and the
  // invoice starts exactly where it would below the printed header.
  let y;
  if (format === 'letterhead') {
    const [shield, ...badges] = await Promise.all([loadImage(SHIELD), ...BADGES.map(loadImage)]);
    y = drawLetterhead(doc, { shield, badges }, margin, pageWidth);
  } else {
    y = mastheadBottom();
  }

  // The same heading the HR reports carry, so the two sets of paperwork read
  // as one company's: bold eleven point, centred.
  doc.setFont('helvetica', 'bold').setFontSize(11);
  doc.text('Sales Tax Invoice', pageWidth / 2, y + 3, { align: 'center' });
  y += 10;

  // ------------------------------------------------- who it is addressed to
  // Every value wraps inside the left half, so a long address or name stops
  // short of the company's box on the right instead of running under it.
  const valueX = margin + 34;
  const valueWidth = pageWidth / 2 + 6 - valueX - 3;
  const lineStep = 4.5;

  const label = (text, value, lineY, bold = false) => {
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text(text, margin, lineY);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const wrapped = doc.splitTextToSize(String(value ?? ''), valueWidth);
    wrapped.forEach((line, i) => doc.text(line, valueX, lineY + i * lineStep));
    return lineY + Math.max(wrapped.length, 1) * lineStep + 0.5;
  };

  let leftY = y;
  leftY = label('CONTACT PERSON :', (invoice.contactPerson || '').trim(), leftY, true);
  leftY = label('DESIGNATION :', (invoice.contactDesignation || '').trim(), leftY);

  doc.setFont('helvetica', 'normal').setFontSize(9);
  doc.text('BILL TO:', margin, leftY);
  const billTo = (invoice.customerName || invoice.customerAccountName || '').trim();
  doc.setFont('helvetica', 'bold');
  doc.setLineWidth(0.3);
  // A long client name wraps too, each line underlined as the legacy voucher has it.
  doc.splitTextToSize(billTo, valueWidth).forEach((line, i, all) => {
    doc.text(line, valueX, leftY);
    doc.line(valueX, leftY + 1, valueX + doc.getTextWidth(line), leftY + 1);
    leftY += i === all.length - 1 ? 7 : lineStep + 0.5;
  });

  doc.setFont('helvetica', 'normal').setFontSize(9);
  [invoice.customerAddress1, invoice.customerAddress2]
    .map((line) => (line || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .forEach((line) => {
      doc.splitTextToSize(line, valueWidth).forEach((part) => {
        doc.text(part, valueX, leftY);
        leftY += lineStep;
      });
    });

  leftY = label('PH:', (invoice.customerPhone || '').trim(), leftY);
  leftY = label('NTN :', (invoice.customerNtn || '').trim(), leftY);

  // ------------------------------------------- the company's own box, right
  const registration = registrationFor(invoice.province);
  const poNo = (invoice.poNo || '').trim();
  const sesNo = (invoice.sesNo || '').trim();
  const fbrNumber = (fbr?.fbrInvoiceNumber || '').trim();

  autoTable(doc, {
    body: [
      ['Sales Tax :', registration.number],
      ['NTN :', NTN_NO],
      ['DATE :', shortDate(invoice.invoiceDate)],
      ['INVOICE', String(invoice.invoiceNo ?? '')],
      ['CUSTOMER ID', customerId(invoice)],
      // The client's own references, only when the invoice carries them.
      ...(poNo ? [['PO NO', poNo]] : []),
      ...(sesNo ? [['SES NO', sesNo]] : []),
      ...(fbrNumber ? [['FBR INVOICE', fbrNumber]] : []),
    ],
    startY: y - 2,
    margin: { left: pageWidth / 2 + 6, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 32 }, 1: { halign: 'left' } },
  });

  y = Math.max(leftY, doc.lastAutoTable.finalY) + 4;

  // ------------------------------------------------- the order it bills for
  const salaryMonth = asDate(invoice.salaryMonth) || asDate(invoice.invoiceDate);
  const monthLabel = salaryMonth
    ? `${MONTHS[salaryMonth.getMonth()]} /${String(salaryMonth.getFullYear()).slice(2)}`
    : '';
  const firstOfMonth = salaryMonth
    ? new Date(salaryMonth.getFullYear(), salaryMonth.getMonth(), 1)
    : null;
  const lastOfMonth = salaryMonth
    ? new Date(salaryMonth.getFullYear(), salaryMonth.getMonth() + 1, 0)
    : null;
  const days = firstOfMonth ? `${slashDate(firstOfMonth)} To ${slashDate(lastOfMonth)}` : '';

  const invoiceDate = asDate(invoice.invoiceDate);
  const due =
    invoiceDate && invoice.paymentDays
      ? new Date(
          invoiceDate.getFullYear(),
          invoiceDate.getMonth(),
          invoiceDate.getDate() + Number(invoice.paymentDays)
        )
      : null;

  autoTable(doc, {
    head: [['ORDER  No.', 'MONTH', 'DAYS', 'DUE DATE', 'TERMS']],
    body: [
      [
        (invoice.billingRef || '').trim(),
        monthLabel,
        days,
        due ? longDate(due) : '',
        (invoice.paymentTerms || '').trim(),
      ],
    ],
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.6, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.2 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 20 }, 2: { cellWidth: 44 }, 3: { cellWidth: 28 } },
  });

  // ------------------------------------------------------------ the lines
  const lines = invoice.lines || [];
  const body = lines.map((line, i) => [
    i + 1,
    (line.invoiceDescription || line.description || line.itemDescription || '').trim(),
    num(line.qty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    money(line.rate),
    money(line.amount),
  ]);

  // Only the lines the invoice has - no blank rows padding it out.

  // The subject - the site the guards stood at - closes the table inside its
  // own box, centred under the descriptions, as the legacy voucher prints it.
  // Legacy types a line break as a long run of spaces as often as a real
  // one ('Feroze1888 Mills Limited          LOCATION : ...'), so both split.
  const subject = (invoice.locationText || '')
    .split(/\r?\n| {4,}/)
    .map((line) => line.replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
  if (subject) {
    body.push([
      '',
      {
        content: subject,
        styles: { fontStyle: 'bold', halign: 'center', cellPadding: { top: 5, bottom: 3, left: 1.6, right: 1.6 } },
      },
      '',
      '',
      '',
    ]);
  }

  autoTable(doc, {
    head: [['S.No.', 'D E S C R I P T I O N', 'QUANTITY', 'RATE', 'AMOUNT']],
    body,
    startY: doc.lastAutoTable.finalY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.6, lineColor: [0, 0, 0], lineWidth: 0.2, minCellHeight: 7 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 86 },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { halign: 'right' },
    },
  });

  y = doc.lastAutoTable.finalY;

  // ---------------------------------------------------------- the totals
  const sales = num(invoice.salesValue);
  const discount = num(invoice.discount);
  const tax = num(invoice.taxAmount);
  const net = num(invoice.netAmount);
  const taxPct = sales ? Math.round((tax / sales) * 100) : 0;

  autoTable(doc, {
    body: [
      ['Total', money(sales)],
      ['Discount', discount ? money(discount) : ''],
      [`S.T @${taxPct}%`, money(tax)],
      ['Grand Total', money(net)],
    ],
    startY: y + 2,
    margin: { left: pageWidth / 2 + 24, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.4, lineColor: [0, 0, 0], lineWidth: 0.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 34 }, 1: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.row.index === 3) data.cell.styles.fontStyle = 'bold';
    },
  });

  doc.setFont('helvetica', 'bold').setFontSize(8);
  doc.text(`RUPEES  ${amountInWords(net)}`, margin, y + 6, { maxWidth: pageWidth / 2 + 6 });

  // ------------------------------------------------------------ the notes
  // The box and the text are measured from the same width, so a long note
  // wraps inside the border instead of running out through it.
  const boxX = margin - 2;
  const boxWidth = (pageWidth - margin * 2 + 4) * 0.63;
  const numberWidth = 5;
  const textWidth = boxWidth - numberWidth - 8;

  doc.setFont('helvetica', 'normal').setFontSize(7.5);
  const wrapped = footerNotes(registration).map((note) => doc.splitTextToSize(note, textWidth));
  const lineHeight = 3.6;
  const noteGap = 1.4;
  const bodyHeight = wrapped.reduce((total, note) => total + note.length * lineHeight + noteGap, 0);

  const notesY = Math.max(doc.lastAutoTable.finalY, y + 14) + 6;

  doc.setFont('helvetica', 'bold').setFontSize(8);
  doc.text('Other Comments or Special Instructions.', margin, notesY);

  doc.setFont('helvetica', 'normal').setFontSize(7.5);
  let noteY = notesY + 4.5;
  wrapped.forEach((note, i) => {
    doc.text(`${i + 1}.`, margin + 2, noteY);
    note.forEach((line, n) => {
      doc.text(line, margin + 2 + numberWidth, noteY + n * lineHeight);
    });
    noteY += note.length * lineHeight + noteGap;
  });

  doc.setLineWidth(0.2);
  const boxHeight = bodyHeight + 7;
  doc.rect(boxX, notesY - 4, boxWidth, boxHeight);

  // Who the cheque is made out to, beside the notes as on the printed one.
  const payeeX = (boxX + boxWidth + pageWidth - margin) / 2;
  doc.setFont('helvetica', 'normal').setFontSize(8);
  doc.text(PAYABLE_TO[0], payeeX, notesY + 2, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(PAYABLE_TO[1], payeeX, notesY + 6.5, { align: 'center' });

  // ------------------------------------------------------------ FBR's mark
  // A reported invoice carries FBR's QR code (an inch square, as FBR asks)
  // and the Digital Invoicing logo, side by side under the payee.
  let fbrBottom = 0;
  if (fbrNumber) {
    const size = 24;
    const top = notesY + 10;
    const [qr, logo] = await Promise.all([fbrQrDataUrl(fbrNumber).catch(() => null), loadImage(FBR_LOGO)]);
    const pairWidth = size * 2 + 4;
    const left = payeeX - pairWidth / 2;
    if (qr) doc.addImage(qr, 'PNG', left, top, size, size);
    if (logo) {
      doc.addImage(logo, 'PNG', left + size + 4, top, size, size);
    } else {
      // No logo file yet: FBR's name for the system in its place.
      doc.setLineWidth(0.2);
      doc.rect(left + size + 4, top, size, size);
      doc.setFont('helvetica', 'bold').setFontSize(7);
      doc.text(['FBR', 'Digital', 'Invoicing', 'System'], left + size + 4 + size / 2, top + 7, {
        align: 'center',
        lineHeightFactor: 1.3,
      });
    }
    doc.setFont('helvetica', 'normal').setFontSize(6.5);
    doc.text(`FBR Invoice No. ${fbrNumber}`, payeeX, top + size + 3.5, { align: 'center' });
    fbrBottom = top + size + 4;
  }

  // ------------------------------------------------------- the signatures
  // The block sits under the notes, but it is held clear of whatever closes
  // the page - the contact lines and the services strip on the soft copy,
  // the paper's own footer on the printed one.
  const lastLine = format === 'letterhead' ? pageHeight - 31 : pageHeight - 16;
  const afterNotes = Math.max(notesY + boxHeight, fbrBottom) + 10;
  const signaturesY = Math.min(afterNotes, lastLine - SIGNATURES_HEIGHT);

  if (signaturesY < afterNotes) {
    console.warn('The invoice ran long; the signature block was pulled up to fit the page.');
  }

  drawSignatures(doc, margin, pageWidth, signaturesY);

  if (format === 'letterhead') {
    drawPageFooter(doc, margin, pageWidth, pageHeight);
  }

  return doc.output('bloburl');
}

export default buildSalesTaxInvoicePdf;
