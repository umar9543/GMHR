import { jsPDF } from 'jspdf';

import { cleanEmployeeName } from 'src/utils/employee-name';

import { loadPhotos } from '../HR_Attendance/employee-photos';

// ----------------------------------------------------------------------
// The employee card, printed onto the company's pre-printed card sheets:
// A4, two cards down the top of the sheet, each a card on the left and the
// "Company Record Copy" on the right, cut apart along the dashed lines.
//
// FRONT - the pre-printed side, as the legacy card prints it. On the card:
// the photo into the white box beside the logo, and the card's details -
// No., Name, Appointment, N.I.C. #, Date of Joining with their labels and
// lines - in the space under the banner, then the two signature lines. On
// the record copy only the values, beside its printed labels, with the photo.
//
// BACK - blank on our sheets; optional. The same details again, labels and
// all, behind the card.
//
// Every position is in millimetres from the sheet's top-left corner, taken
// from a scan of a blank sheet. A printer that feeds a little off is set
// right with the calibration offsets, not by moving these.
// ----------------------------------------------------------------------

const PAGE_W = 210;
const PAGE_H = 297;

// The scan of a blank sheet, drawn behind the data only when checking the
// fit on screen. It is the sheet's full width; its height in mm follows.
export const TEMPLATE_URL = '/assets/cards/employee-card-front.jpg';
const TEMPLATE_H = PAGE_W * (1600 / 1163);

// Card 1's top edge (the dashed line) and the distance to card 2.
const CARD_TOP = 8.3;
const CARD_PITCH = 60.3;
const CARD_W = 96.6; // the card part, left of the dashed line down the middle
const CARD_H = 60.3;

// Front, card 1. Card 2 is the same, CARD_PITCH lower.
const FRONT = {
  cardPhoto: { x: 63.6, y: 26.4, w: 27.2, h: 33.4 },
  copyPhoto: { x: 159.4, y: 22.9, w: 27.3, h: 33.4 },
  // Each value's left edge and baseline, just above its printed line.
  company: { x: 119.5, y: 28.4 },
  name: { x: 112.8, y: 35.2 },
  cnic: { x: 114.2, y: 41.8 },
  issue: { x: 118.4, y: 48.5 },
  prepared: { x: 121.4, y: 55.3 },
};

// The card's details on the front, within the card's own area: under the
// logo and banner, left of the photo box (which starts at 63.6 mm).
const FRONT_DETAILS = {
  rows: [
    { label: 'No.:', key: 'code', y: 22, valueX: 12, bold: true },
    { label: 'Name:', key: 'name', y: 28, valueX: 13 },
    { label: 'Appointment:', key: 'jobTitle', y: 34, valueX: 21 },
    { label: 'N.I.C. #:', key: 'nic', y: 40, valueX: 17 },
    { label: 'Date of Joining:', key: 'joiningDate', y: 46, valueX: 26 },
  ],
  labelX: 3.5,
  lineEndX: 61,
  labelSize: 7,
  valueSize: 8,
  codeSize: 10,
  photo: null, // already in the printed box
  signatures: [
    { x1: 3.5, x2: 38, caption: 'Signature Holder' },
    { x1: 52, x2: 92, caption: 'Signature Authority' },
  ],
  signatureY: 55,
  captionSize: 5,
};

// Back, within the card's own area (CARD_W x CARD_H), as the legacy card.
const BACK = {
  rows: [
    { label: 'No.:', key: 'code', y: 9, valueX: 14, bold: true },
    { label: 'Name:', key: 'name', y: 16, valueX: 15 },
    { label: 'Appointment:', key: 'jobTitle', y: 23, valueX: 23 },
    { label: 'N.I.C. #:', key: 'nic', y: 30, valueX: 19 },
    { label: 'Date of Joining:', key: 'joiningDate', y: 37, valueX: 29 },
  ],
  labelX: 4,
  lineEndX: 62,
  labelSize: 7.5,
  valueSize: 8.5,
  codeSize: 11,
  photo: { x: 65, y: 4, w: 27, h: 33 },
  signatures: [
    { x1: 4, x2: 40, caption: 'Signature Holder' },
    { x1: 54, x2: 92, caption: 'Signature Authority' },
  ],
  signatureY: 50,
  captionSize: 5.5,
};

const PHOTO_ASPECT = 27.2 / 33.4;

async function loadImage(url) {
  try {
    const res = await fetch(url);
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

const longDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso || '';
  return d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
};

/** Fit text into a width by shrinking the font, down to a floor. */
function fitText(doc, text, maxWidth, size, minSize = 6) {
  let s = size;
  doc.setFontSize(s);
  while (s > minSize && doc.getTextWidth(text) > maxWidth) {
    s -= 0.5;
    doc.setFontSize(s);
  }
}

/** The card's details - labels, values, lines, photo, signatures - at x0, y0. */
function drawDetails(doc, layout, x0, y0, values, photo) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.setTextColor(0, 0, 0);
  layout.rows.forEach((row) => {
    doc.setFont('times', 'bolditalic').setFontSize(layout.labelSize);
    doc.text(row.label, x0 + layout.labelX, y0 + row.y);
    doc.line(x0 + row.valueX - 1, y0 + row.y + 1.2, x0 + layout.lineEndX, y0 + row.y + 1.2);
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    const text = values[row.key];
    fitText(doc, text, layout.lineEndX - row.valueX - 1, row.bold ? layout.codeSize : layout.valueSize);
    doc.text(text, x0 + row.valueX, y0 + row.y);
  });

  if (layout.photo) {
    // eslint-disable-next-line no-use-before-define
    drawPhoto(doc, photo, {
      x: x0 + layout.photo.x,
      y: y0 + layout.photo.y,
      w: layout.photo.w,
      h: layout.photo.h,
    });
  }

  layout.signatures.forEach((s) => {
    doc.line(x0 + s.x1, y0 + layout.signatureY, x0 + s.x2, y0 + layout.signatureY);
    doc.setFont('times', 'bolditalic').setFontSize(layout.captionSize);
    doc.text(s.caption, x0 + (s.x1 + s.x2) / 2, y0 + layout.signatureY + 2.3, { align: 'center' });
  });
}

function drawPhoto(doc, photo, box) {
  if (!photo) return;
  try {
    doc.addImage(photo.url, 'JPEG', box.x, box.y, box.w, box.h);
  } catch {
    /* a broken photo leaves the box empty */
  }
}

/**
 * @param employees  [{ empId, name, jobTitle, nic, joiningDate, hasPicture }]
 * @param options    side: 'front' | 'back'
 *                   preparedBy, issueDate ('yyyy-mm-dd')
 *                   offset: { x, y } in mm - this printer's calibration
 *                   copyOffsets: [{ x, y }, { x, y }] in mm - a further nudge
 *                     for the upper and the lower record copy, whose place on
 *                     the pre-printed sheets varies a little from the cards'
 *                   backTurn: 'sideways' | 'topBottom' - how the sheet is
 *                     turned over to print the back
 *                   showTemplate: draw the blank sheet behind (checking only)
 *                   onProgress(done, total)
 * @returns { url, missing }
 */
export async function buildEmployeeCardPdf(employees, options = {}) {
  const {
    side = 'front',
    preparedBy = '',
    issueDate = '',
    offset = { x: 0, y: 0 },
    copyOffsets = [],
    backTurn = 'sideways',
    showTemplate = false,
    onProgress,
  } = options;
  if (!employees?.length) throw new Error('Pick at least one employee');

  const photos = await loadPhotos(employees, {
    maxW: 220,
    maxH: 270,
    aspect: PHOTO_ASPECT,
    onProgress,
  });
  const template = showTemplate && side === 'front' ? await loadImage(TEMPLATE_URL) : null;

  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const dx = Number(offset?.x) || 0;
  const dy = Number(offset?.y) || 0;

  for (let start = 0; start < employees.length; start += 2) {
    if (start > 0) doc.addPage();
    const pair = employees.slice(start, start + 2);

    if (template) doc.addImage(template, 'JPEG', 0, 0, PAGE_W, TEMPLATE_H);

    pair.forEach((emp, slot) => {
      const photo = photos.get(emp.empId);
      const name = cleanEmployeeName(emp.name) || `Employee ${emp.empId}`;
      const values = {
        code: String(emp.empId),
        name,
        jobTitle: emp.jobTitle || '',
        nic: emp.nic || '',
        joiningDate: emp.joiningDate || '',
      };

      if (side === 'front') {
        const oy = slot * CARD_PITCH + dy;
        const at = (p) => ({ ...p, x: p.x + dx, y: p.y + oy });
        drawPhoto(doc, photo, at(FRONT.cardPhoto));
        drawDetails(doc, FRONT_DETAILS, dx, CARD_TOP + oy, values, photo);

        // The record copy, with its own nudge on top of the sheet's.
        const cx = dx + (Number(copyOffsets[slot]?.x) || 0);
        const cy = oy + (Number(copyOffsets[slot]?.y) || 0);
        drawPhoto(doc, photo, { ...FRONT.copyPhoto, x: FRONT.copyPhoto.x + cx, y: FRONT.copyPhoto.y + cy });

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(String(emp.empId), FRONT.company.x + cx, FRONT.company.y + cy);

        doc.setFont('helvetica', 'normal');
        fitText(doc, name, 44, 9.5);
        doc.text(name, FRONT.name.x + cx, FRONT.name.y + cy);
        doc.setFontSize(9.5);
        doc.text(emp.nic || '', FRONT.cnic.x + cx, FRONT.cnic.y + cy);
        doc.text(longDate(issueDate), FRONT.issue.x + cx, FRONT.issue.y + cy);
        fitText(doc, preparedBy, 35, 9.5);
        doc.text(preparedBy, FRONT.prepared.x + cx, FRONT.prepared.y + cy);
        return;
      }

      // ---------------------------------------------------------- back
      // Behind the card. Turned over sideways, the card's back is on the
      // right of the sheet; turned top to bottom it stays left, but the
      // cards come up from the bottom in reverse order.
      const x0 = (backTurn === 'sideways' ? PAGE_W - CARD_W : 0) + dx;
      const y0 =
        (backTurn === 'sideways'
          ? CARD_TOP + slot * CARD_PITCH
          : PAGE_H - CARD_TOP - (slot + 1) * CARD_PITCH) + dy;

      if (showTemplate) {
        // Where the card is, as a cutting outline - on screen only.
        doc.setDrawColor(160, 160, 160);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.rect(x0, y0, CARD_W, CARD_H);
        doc.setLineDashPattern([], 0);
      }

      drawDetails(doc, BACK, x0, y0, values, photo);
    });
  }

  return {
    url: doc.output('bloburl'),
    missing: employees.filter((e) => !photos.has(e.empId)).length,
  };
}

export default buildEmployeeCardPdf;
