// eslint-disable-next-line new-cap -- jsPDF is the library's own exported name
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { APP_API } from 'src/config-global';

const NO_IMAGE = '/assets/images/no-image.jpg';

const COMPANY = 'GUARDS MARK SECURITY SERVICES (PVT) LTD.';

const money = (value) => Math.round(Number(value) || 0).toLocaleString('en-US');

const dmy = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/**
 * Employee photos live as binary in EMPLOYEE_PICS.PICBOX, not on disk - PICPATH
 * is a legacy column holding capture-machine paths that no web server can reach.
 * /picture streams the blob; a missing one 404s and we fall back to the
 * placeholder.
 */
function pictureCandidates(empCode) {
  if (!empCode) return [NO_IMAGE];
  return [`${APP_API}/api/Employee/${empCode}/picture`, NO_IMAGE];
}

/**
 * Fetched rather than drawn through a canvas: a cross-origin image taints the
 * canvas and toDataURL then throws, which is exactly this case - the API sits on
 * a different origin to the app.
 */
async function toDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed: ${url} (${res.status})`);

  const blob = await res.blob();
  if (!blob.type.startsWith('image/')) throw new Error(`not an image: ${url}`);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`unreadable: ${url}`));
    reader.readAsDataURL(blob);
  });
}

/**
 * Resolves to the first URL that loads. Candidates are tried in order and the
 * last one is always the local no-image placeholder, so this only returns null
 * if even that is missing.
 */
function loadImageDataUrl(urls) {
  return urls.reduce(
    (chain, url) => chain.then((found) => found || toDataUrl(url).catch(() => null)),
    Promise.resolve(null)
  );
}

/**
 * Builds the individual salary voucher and returns it as a Blob.
 *
 * @param {object} slip response from GET /api/salarysheet/{id}/slip
 */
export async function buildSalarySlipPdf(slip) {
  // eslint-disable-next-line new-cap -- jsPDF is the library's own exported name
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 12;
  const right = pageWidth - 12;

  const photo = await loadImageDataUrl(pictureCandidates(slip.empCode));

  // ---- header -------------------------------------------------------------
  const logoUrl = '/assets/images/gms.png';

  try {
    const logo = await toDataUrl(logoUrl);
    if (logo) {
      // Sized and placed so its vertical centre sits on the header text block
      // (company title baseline 14, date/time at 11/15) instead of hanging
      // below it.
      const logoSize = 16;
      const logoY = 12.5 - logoSize / 2;
      doc.addImage(logo, 'PNG', left, logoY, logoSize, logoSize);
    }
  } catch (e) {
    console.log(e);
  }


  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 160);
  doc.text(COMPANY, pageWidth / 2, 14, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  const now = new Date();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Date: ${now.toDateString()}`, right, 11, { align: 'right' });
  doc.text(`Time: ${now.toLocaleTimeString()}`, right, 15, { align: 'right' });

  // Grey banner
  const bannerY = 30;
  const bannerHeight = 7;

  doc.setFillColor(190, 190, 190);
  doc.rect(left, bannerY, right - left, bannerHeight, 'F');
  // Label and month are measured, then centred as a pair. Centring each of them
  // separately printed one on top of the other.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);

  const bannerLabel = 'SALARY FOR THE MONTH OF';
  const monthLabel = slip.salaryMonthLabel || '';
  const gap = 4;

  const labelW = doc.getTextWidth(bannerLabel);
  const monthW = doc.getTextWidth(monthLabel);

  const bannerX = (pageWidth - (labelW + gap + monthW)) / 2;
  const monthX = bannerX + labelW + gap;

  const bannerTextY = bannerY + 5;

  // Label
  doc.setTextColor(0, 0, 160);
  doc.text(bannerLabel, bannerX, bannerTextY);

  // Month
  doc.setTextColor(0, 0, 0);
  doc.text(monthLabel, monthX, bannerTextY);
  doc.setLineWidth(0.3);
  doc.line(monthX, bannerTextY + 1.2, monthX + monthW, bannerTextY + 1.2);

  // Photo sits top right, below the banner; the detail rows run alongside it
  // rather than underneath, so there is no dead band between banner and data.
  const photoW = 28;
  const photoH = 34;
  const photoX = right - photoW;
  const photoY = bannerY + bannerHeight + 4;

  if (photo) {
    try {
      const format = photo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(photo, format, photoX, photoY, photoW, photoH);
    } catch {
      // an unreadable image must never stop the voucher printing
    }
  }
  doc.setLineWidth(0.2);
  doc.rect(photoX, photoY, photoW, photoH);

  // ---- identification block ------------------------------------------------
  // Two label/value pairs per line. The right-hand values stop short of the
  // photo so nothing runs underneath it.
  const labelX = left;
  const valueX = left + 40;
  const rLabelX = left + 92;
  const rValueX = photoX - 6;

  const voucher = slip.voucherNo != null ? String(slip.voucherNo) : '';

  const rows = [
    // Voucher number leads.
    ['VOUCHER NO. :', voucher, 'Date :', dmy(slip.salaryDate),],

    ['C# :', slip.empCode != null ? String(slip.empCode) : ''],
    ['RANK', slip.rank || '', 'SALARY BASIC', money(slip.salaryBasic)],
    ['EMPLOYEE NAME', slip.employeeName || '', 'FOOD ALLOWANCE', money(slip.foodAllowance)],
    ['LOCATION', slip.locationName || '', 'EP / EXTRA ALLOUNCE',
      slip.epExtraAllowance ? money(slip.epExtraAllowance) : '',],
    ['LAST SERVICE DATE', dmy(slip.lastServiceDate), 'LAST SERVICE SHIFT', slip.lastServiceShift || ''],
  ];

  doc.setFontSize(8);
  // First data row aligns with the top of the photo, below the banner.
  let y = photoY + 4;
  rows.forEach(([label, value, rLabel, rValue], i) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), valueX, y);

    if (rLabel) {
      doc.setFont('helvetica', 'bold');
      doc.text(rLabel, rLabelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(rValue), rValueX, y, { align: 'right' });
    }

    // Rule under the voucher number, as on the printed original.
    if (i === 0) doc.line(valueX - 2, y + 1, rLabelX - 6, y + 1);

    y += 5.5;
  });

  // ---- SALARY DETAILS table ----------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  y = Math.max(y, photoY + photoH) + 4;
  doc.text('SALARY DETAILS:', left, y);
  doc.line(left, y + 0.8, left + doc.getTextWidth('SALARY DETAILS:'), y + 0.8);
  y += 3;

  // Four columns: earnings label / days / amount, then the deductions pair.
  const body = [
    ['WORKING DAYS', slip.workingDays || '', money(slip.workingAmount), 'ADVANCE', money(slip.advance)],
    ['ALLOUNCE DAY', slip.allowanceDays || '', money(slip.allowanceAmount), 'FINE', money(slip.fine)],
    ['OVER TIME', slip.overtimeDays || '', money(slip.overtimeAmount), 'VERIFICATION CHARGES', money(slip.verificationCharges)],
    ['E.P ALLOUNCE', '', slip.epAllowanceAmount ? money(slip.epAllowanceAmount) : '', 'LOAN', money(slip.loan)],
    ['', '', '', 'OTHER DEDUCTIONS', slip.otherDeductions ? money(slip.otherDeductions) : ''],
    ['', '', '', 'I. WHT', money(slip.incomeTaxWht)],
    ['', '', '', 'EOBI', money(slip.eobi)],
    ['TOTAL AMOUNT', '', money(slip.totalAmount), 'TOTAL DEDUCTIONS', money(slip.totalDeductions)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['', 'WORK DAYS', 'AMOUNT', '', '']],
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 1.2,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    // Widths total the printable width (page minus both margins) so the grid
    // spans the full page instead of stopping two thirds across.
    columnStyles: {
      0: { cellWidth: (right - left) * 0.22, fontStyle: 'bold' },
      1: { cellWidth: (right - left) * 0.13, halign: 'center' },
      2: { cellWidth: (right - left) * 0.17, halign: 'right' },
      3: { cellWidth: (right - left) * 0.31, fontStyle: 'bold' },
      4: { cellWidth: (right - left) * 0.17, halign: 'right' },
    },
    tableWidth: right - left,
    margin: { left, right: doc.internal.pageSize.getWidth() - right },
  });

  // ---- totals -------------------------------------------------------------
  let ty = doc.lastAutoTable.finalY + 5;
  const totalLine = (label, value, underline = false) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const amountRight = left + (right - left) * 0.52;
    doc.text(label, left, ty);
    doc.setFont('helvetica', 'normal');
    doc.text(money(value), amountRight, ty, { align: 'right' });
    if (underline) doc.line(amountRight - 28, ty + 1, amountRight + 2, ty + 1);
    ty += 5.5;
  };

  totalLine('SALARY EARNED', slip.salaryEarned);
  totalLine('DEDUCTIONS', slip.totalDeductions);
  totalLine('TOTAL AMOUNT TO BE PAID', slip.netPayable, true);

  doc.setFont('helvetica', 'bold');
  doc.text(String(slip.amountInWords || ''), left, ty + 1);

  // ---- signatures ---------------------------------------------------------
  let sy = ty + 12;
  [['GUARD SIGNATURE'], ['THUMB IMPRESSION']].forEach(([label]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, left + (right - left) * 0.34, sy);
    doc.line(left + (right - left) * 0.55, sy, right, sy);
    sy += 12;
  });

  // ---- footer sign-off row ------------------------------------------------
  const footY = doc.internal.pageSize.getHeight() - 22;
  const slots = ['OPERATION', 'ACCOUNTS', 'MANAGER OPERATION', 'DIRECTOR'];
  const slotWidth = (right - left) / slots.length;
  slots.forEach((label, i) => {
    const cx = left + slotWidth * i + slotWidth / 2;
    doc.line(cx - 22, footY, cx + 22, footY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(label, cx, footY + 4, { align: 'center' });
  });

  return doc.output('blob');
}

/** Fetches one employee's slip for a period, without knowing its row id. */
export async function fetchSlipByEmployee(empId, month, year, token) {
  const params = new URLSearchParams({
    empId: String(empId),
    month: String(month),
    year: String(year),
  });
  const res = await fetch(`${APP_API}/api/salarysheet/slip/by-employee?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token || ''}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Fetches the slip data and downloads the voucher. */
export async function downloadSalarySlip(id, token) {
  const res = await fetch(`${APP_API}/api/salarysheet/${id}/slip`, {
    headers: { Authorization: `Bearer ${token || ''}` },
  });
  if (!res.ok) throw new Error(await res.text());

  const slip = await res.json();
  const blob = await buildSalarySlipPdf(slip);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Salary_Slip_${slip.empCode || id}_${slip.salaryMonthLabel || ''}.pdf`.replace(/\s+/g, '_');
  link.click();
  URL.revokeObjectURL(url);

  return slip;
}
