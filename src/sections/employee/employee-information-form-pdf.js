import { jsPDF } from 'jspdf';

import { APP_API } from 'src/config-global';

// ---------------------------------------------------------------------------
// The printed Employee Information Form, two pages.
//
// This is a redesign of the legacy form rather than a copy of it: same
// sections, same fields, same reading order, but set as a proper grid with
// tinted label cells, navy section bands and hairline rules, so it holds up
// when it is printed and filed.
//
//   Page 1  details, with the photograph top right and the signature beneath
//           it. The employee form's second upload box is labelled NIC but the
//           signature is what is actually scanned into it, which is why the
//           signature comes from EMP_NIC.
//   Page 2  the CNIC front and back, then the four discharge book pages.
//
// All of it arrives from one call, GET /api/employee/{id}/information-form.
// ---------------------------------------------------------------------------

const COMPANY = 'GUARDS MARK SECURITY SERVICES (PVT) LTD';
const TITLE = 'Employee Information Form';

const PAGE_W = 210;
const PAGE_H = 297;
const LEFT = 10;
const RIGHT = 200;
const WIDTH = RIGHT - LEFT;

const COLS = 3;
const COL_W = WIDTH / COLS;
const LABEL_W = 27;

const ROW_H = 7.6;
const VERIFY_LABEL_W = 68;

const NAVY = [23, 43, 77];
const INK = [17, 24, 39];
const MUTED = [95, 104, 119];
const LABEL_BG = [242, 244, 247];
const BORDER = [178, 186, 199];
const WHITE = [255, 255, 255];

const HAIRLINE = 0.15;

const text = (v) => {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  // Placeholders and the stray booleans an older build wrote into some
  // columns should print as blank rather than as the word "true".
  return /^(-+|\.+|nil|n\/a|n\.a|na|n\/l|not applicable|true|false)$/i.test(s) ? '' : s;
};

/** A 13-digit CNIC printed with its dashes, 11111-1111111-1. Anything else prints as stored. */
const formatCnic = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 13) return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  return text(value);
};

/** yyyy-MM-dd from the API as dd/MM/yyyy. */
const fmtIsoDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
};

async function loadDataUrl(url) {
  try {
    const res = await fetch(url);
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

// The scans are whatever the scanner or the uploader produced. jsPDF decodes
// by the data url's type, so guessing JPEG for a PNG silently drops the image.
// The base64 prefix identifies the real format.
const MIME_BY_PREFIX = [
  ['/9j/', 'image/jpeg'],
  ['iVBORw0KGgo', 'image/png'],
  ['R0lGOD', 'image/gif'],
  ['Qk', 'image/bmp'],
  ['UklGR', 'image/webp'],
];

const asDataUrl = (base64) => {
  if (!base64) return null;
  const match = MIME_BY_PREFIX.find(([prefix]) => base64.startsWith(prefix));
  return `data:${match ? match[1] : 'image/jpeg'};base64,${base64}`;
};

export async function buildEmployeeInformationFormPdf(employeeId) {
  const res = await fetch(`${APP_API}/api/employee/${employeeId}/information-form`);
  if (!res.ok) throw new Error('Could not load the employee information form');
  const data = await res.json();

  const emp = data.employee ?? {};
  const dates = data.dates ?? {};
  const images = data.images ?? {};
  // School/College, caste, next of kin and EVS, from EMPLOYEE_ADDITIONAL_INFO.
  const extra = data.additionalInfo ?? {};

  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = 0;

  // ---------------------------------------------------------------- drawing

  /** A framed scan, or an empty frame with a caption when there is none. */
  const scan = (dataUrl, x, top, w, h, caption) => {
    doc.setFillColor(...WHITE).setDrawColor(...BORDER).setLineWidth(HAIRLINE);
    doc.rect(x, top, w, h, 'FD');

    if (dataUrl) {
      try {
        doc.addImage(dataUrl, x + 0.5, top + 0.5, w - 1, h - 1);
        return;
      } catch {
        /* a scan that will not decode falls through to the caption */
      }
    }
    if (caption) {
      doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...MUTED);
      doc.text(caption, x + w / 2, top + h / 2, { align: 'center' });
    }
  };

  /** Navy section band with its title in white. */
  const band = (label) => {
    doc.setFillColor(...NAVY).rect(LEFT, y, WIDTH, 6, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(8.4).setTextColor(...WHITE);
    doc.text(label.toUpperCase(), LEFT + 3, y + 4.1, { charSpace: 0.3 });
    y += 6;
  };

  /** One label cell plus its value cell, drawn as a contiguous pair. */
  const cell = (x, label, value, valueW, height) => {
    doc.setLineWidth(HAIRLINE).setDrawColor(...BORDER);

    doc.setFillColor(...LABEL_BG).rect(x, y, LABEL_W, height, 'FD');
    doc.setFont('helvetica', 'bold').setFontSize(6.8).setTextColor(...MUTED);
    const labelLines = doc.splitTextToSize(label, LABEL_W - 3);
    doc.text(labelLines, x + 2, y + height / 2 - (labelLines.length - 1) * 1.1 + 0.9, {
      lineHeightFactor: 1.15,
    });

    doc.setFillColor(...WHITE).rect(x + LABEL_W, y, valueW, height, 'FD');
    doc.setFont('helvetica', 'normal').setFontSize(8.2).setTextColor(...INK);
    const clean = text(value);
    const valueLines = doc.splitTextToSize(clean, valueW - 3).slice(0, 2);
    if (valueLines.length > 1) doc.setFontSize(7);
    doc.text(valueLines, x + LABEL_W + 2, y + height / 2 - (valueLines.length - 1) * 1.3 + 1, {
      lineHeightFactor: 1.15,
    });
  };

  /**
   * A row of up to three fields. `span` widens a field across that many
   * columns, which is how the addresses and the documents line are printed.
   */
  const row = (fields) => {
    let col = 0;
    fields.forEach(([label, value, span = 1]) => {
      cell(LEFT + col * COL_W, label, value, COL_W * span - LABEL_W, ROW_H);
      col += span;
    });
    y += ROW_H;
  };

  /** The verification rows: a long label on the left, one wide value. */
  const verifyRow = (label, value) => {
    doc.setLineWidth(HAIRLINE).setDrawColor(...BORDER);

    doc.setFillColor(...LABEL_BG).rect(LEFT, y, VERIFY_LABEL_W, ROW_H, 'FD');
    doc.setFont('helvetica', 'bold').setFontSize(6.8).setTextColor(...MUTED);
    doc.text(label, LEFT + 2, y + ROW_H / 2 + 0.9);

    doc.setFillColor(...WHITE).rect(LEFT + VERIFY_LABEL_W, y, WIDTH - VERIFY_LABEL_W, ROW_H, 'FD');
    doc.setFont('helvetica', 'normal').setFontSize(8.2).setTextColor(...INK);
    const lines = doc.splitTextToSize(text(value), WIDTH - VERIFY_LABEL_W - 3).slice(0, 2);
    if (lines.length > 1) doc.setFontSize(7);
    doc.text(lines, LEFT + VERIFY_LABEL_W + 2, y + ROW_H / 2 - (lines.length - 1) * 1.3 + 1, {
      lineHeightFactor: 1.15,
    });
    y += ROW_H;
  };

  const gap = (mm = 2.2) => {
    y += mm;
  };

  // ---------------------------------------------------------------- page 1

  // The full Guards Mark logo, as in the sidebar. It is a wide wordmark,
  // 1024 x 227, so it is drawn at that proportion.
  const logo = await loadDataUrl('/assets/images/gms-logo.png');
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', LEFT, 6, 72, 16);
    } catch {
      /* the header must survive a missing logo */
    }
  }

  doc.setFont('helvetica', 'bold').setFontSize(12.5).setTextColor(...NAVY);
  doc.text(TITLE, 163, 13.5, { align: 'right' });

  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED);
  doc.text(COMPANY, 163, 19.5, { align: 'right' });

  const name = [emp.FIRSTNAME, emp.LASTNAME].map(text).filter(Boolean).join(' ');
  const gender = Number(emp.GENDER) === 1 ? 'Female' : 'Male';
  const marital = Number(emp.MARITALSTATUS) === 1 ? 'Married' : 'Single';

  // Photograph top right with the signature directly beneath it.
  scan(asDataUrl(images.photo), 170.5, 6, 29.5, 31, 'Photograph');
  scan(asDataUrl(images.signature), 170.5, 38, 29.5, 12, 'Signature');

  doc.setDrawColor(...NAVY).setLineWidth(0.7).line(LEFT, 25.5, 163, 25.5);

  // Identity strip, so the head of the page carries the name at a glance and
  // the space beside the photograph is not left blank.
  doc.setFillColor(...LABEL_BG).setDrawColor(...BORDER).setLineWidth(HAIRLINE);
  doc.rect(LEFT, 29.5, 153, 19.5, 'FD');

  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...INK);
  doc.text(name || '-', LEFT + 4, 38.5);

  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...MUTED);
  const strip = [
    `Employee No. ${text(emp.ID)}`,
    text(data.appointment),
    dates.dateOfEnrollment ? `Enrolled ${dates.dateOfEnrollment}` : '',
    formatCnic(emp.NIC) ? `CNIC ${formatCnic(emp.NIC)}` : '',
  ].filter(Boolean);
  doc.text(strip.join('     ·     '), LEFT + 4, 45.5);

  y = 53;

  band('General Information');
  row([

    ['Name', name],
    ['Father Name', emp.MIDDLENAME],
    ['Gender', gender],
  ]);
  row([
    ['Date of Birth', dates.dateOfBirth],
    ['Age', emp.AGE],
    ['Marital Status', marital],
  ]);
  row([
    ['Appointment', data.appointment],
    ['Date of Enrollment', dates.dateOfEnrollment],
    ['Mark of Identification', emp.MARKID],
  ]);
  row([
    ['CNIC Number', formatCnic(emp.NIC)],
    ['NIC Validity', dates.nicValidity],
    ['Family Number', emp.FAMILYNO],
  ]);

  gap();
  band('Address & Contact Details');
  row([['Present Address', emp.ADDRESS, 3]]);
  row([['Permanent Address', emp.PADDRESS, 3]]);
  row([
    ['City', emp.CITY],
    ['Cell Phone', emp.CELLPHONE],
    ['Phone (Res)', emp.CELLPHONE],
  ]);
  row([
    ['Caste', extra.caste],
    ['SECT', emp.SECT],
    ['Documents Deposited', emp.DOCUMENTS],
  ]);
  // KIN holds the emergency contact's relation.
  row([
    ['Emergency Contact (Name)', emp.EMERGENCYNAME],
    ['Relation', emp.KIN],
    ['Emergency Contact (Number)', emp.EMERGENCYPHONE],
  ]);
  row([
    ['Next of Kin (Name)', extra.nokName],
    ['Relation', extra.nokRelation],
    ['Next of Kin (Number)', extra.nokPhone],
  ]);

  gap();
  band('Previous Information');
  row([
    ['Ex-Armed Forces Group', emp.EXARMED],
    ['Rank', emp.EXARMEDRANK],
    ['Service Duration', emp.EXARMEDSERVICE],
  ]);
  row([
    ['Ex-Security Company', emp.EXSECURITY],
    ['Service Duration', emp.EXSECURITYSERVICE],
    ['Medical Category', emp.MEDICAL],
  ]);
  // Education lives in the NTN column, which the legacy app repurposed for it.
  row([
    ['Education', emp.NTN],
    // ['School / College', extra.schoolCollege],
    ['APSAA Course', emp.APSAA],
  ]);

  gap();
  band('Nadra and EVS Verification');
  row([
    ['CNIC Number', formatCnic(emp.NIC)],
    ['CNIC Validity', dates.nicValidity],
    ['Nadra Verified', emp.NADRAVERIFY],
  ]);
  row([
    ['EVS Verified', extra.evsVerified],
    ['Verification Date', fmtIsoDate(extra.evsDate), 2],
  ]);

  gap();
  band('Home Town Verification');
  verifyRow('Home Town Address', emp.PADDRESS);
  verifyRow('Status of Verification Dispatched (Yes/No)', emp.HOMEDISPATCH);
  verifyRow('Verification Done (Yes/No)', emp.HOMEVERIFY);
  verifyRow('Verified By Police Station (Name)', emp.HOMEPOLICE);

  gap();
  band('Local Town Verification');
  verifyRow('Local Town Address', emp.ADDRESS);
  verifyRow('Status of Verification Dispatched (Yes/No)', emp.LOCALDISPATCH);
  verifyRow('Verification Done (Yes/No)', emp.LOCALVERIFY);
  verifyRow('Verified By Police Station (Name)', emp.LOCALPOLICE);

  // Only the scans that exist are printed. A section with nothing in it is
  // left out, and if neither has anything the second page is not produced.
  const cnicScans = [
    ['CNIC Front', images.cnicFront],
    ['CNIC Back', images.cnicBack],
  ].filter(([, image]) => !!image);

  const bookScans = (images.dischargeBook ?? [])
    .map((image, index) => [`Page ${index + 1}`, image])
    .filter(([, image]) => !!image);

  const hasScans = cnicScans.length > 0 || bookScans.length > 0;

  doc.setDrawColor(...BORDER).setLineWidth(HAIRLINE).line(LEFT, PAGE_H - 12, RIGHT, PAGE_H - 12);
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...MUTED);
  doc.text(`${name}   ·   Employee No. ${text(emp.ID)}`, LEFT, PAGE_H - 8);
  if (hasScans) {
    doc.setFont('helvetica', 'bold').setTextColor(...NAVY);
    doc.text('P.T.O', RIGHT, PAGE_H - 8, { align: 'right' });
  }

  if (!hasScans) return doc.output('bloburl');

  // ---------------------------------------------------------------- page 2
  doc.addPage();

  const IMG_W = 92.5;
  const IMG_H = 63;
  const COL_L = LEFT;
  const COL_R = LEFT + 97.5;

  const scanBand = (label) => {
    doc.setFillColor(...NAVY).rect(LEFT, y, WIDTH, 6, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(8.4).setTextColor(...WHITE);
    doc.text(label.toUpperCase(), LEFT + 3, y + 4.1, { charSpace: 0.3 });
    y += 6 + 6;
  };

  /** Two scans to a row, packed so a missing page leaves no hole. */
  const grid = (items) => {
    items.forEach(([caption, image], index) => {
      const top = y + Math.floor(index / 2) * (IMG_H + 8);
      const x = index % 2 === 0 ? COL_L : COL_R;
      doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...MUTED);
      doc.text(caption, x, top - 1.8);
      scan(asDataUrl(image), x, top, IMG_W, IMG_H);
    });
    y += Math.ceil(items.length / 2) * (IMG_H + 8);
  };

  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...NAVY);
  doc.text('Supporting Documents', LEFT, 16);
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
  doc.text(`${name}   ·   Employee No. ${text(emp.ID)}`, LEFT, 21.5);
  doc.setDrawColor(...NAVY).setLineWidth(0.7).line(LEFT, 24.5, RIGHT, 24.5);

  y = 31;

  if (cnicScans.length) {
    scanBand('CNIC');
    grid(cnicScans);
    y += 2;
  }

  if (bookScans.length) {
    scanBand('Discharge Book');
    grid(bookScans);
  }

  doc.setDrawColor(...BORDER).setLineWidth(HAIRLINE).line(LEFT, PAGE_H - 12, RIGHT, PAGE_H - 12);
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...MUTED);
  doc.text(COMPANY, LEFT, PAGE_H - 8);
  doc.text('Page 2 of 2', RIGHT, PAGE_H - 8, { align: 'right' });

  return doc.output('bloburl');
}

export default buildEmployeeInformationFormPdf;
