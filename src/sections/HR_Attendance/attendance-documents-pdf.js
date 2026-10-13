import { jsPDF } from 'jspdf';

import { cleanEmployeeName } from 'src/utils/employee-name';

import { loadLogo, drawReportHeader } from './report-header';
import { dmy, text, field, longDate, asDataUrl, prepareAttendanceDocuments } from './attendance-documents-data';

// ---------------------------------------------------------------------------
// The documents behind a day's attendance: one block per guard, in the order
// the sheet lists them.
//
//   details   serial, client, name, CNIC and shift, with the photograph and
//             the signature beside them
//   CNIC      the front and the back, side by side
//   book      the discharge book pages, only for the guards who have them
//
// The data comes from attendance-documents-data.js, which the Word builder
// reads too, so the two formats always say the same thing.
// ---------------------------------------------------------------------------

const LEFT = 10;
const RIGHT = 200;
const WIDTH = RIGHT - LEFT;
const PAGE_H = 297;
const BOTTOM = PAGE_H - 12;

const NAVY = [23, 43, 77];
const INK = [17, 24, 39];
const MUTED = [95, 104, 119];
const LABEL_BG = [242, 244, 247];
const BORDER = [178, 186, 199];
const WHITE = [255, 255, 255];

const HAIRLINE = 0.15;

// The block's parts, in millimetres.
const DETAIL_H = 32;
const CNIC_H = 55;
const BOOK_H = 34;
// Room between one guard's block and the next, with the dotted rule halfway.
const GAP = 9;


export async function buildAttendanceDocumentsPdf(rows, dateStr, options = {}) {
  const { documents, single, client, heading, strength, missing } =
    await prepareAttendanceDocuments(rows, options);

  // eslint-disable-next-line new-cap -- jsPDF is the library's own exported name
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logo = await loadLogo();


  /** A framed scan, or an empty frame saying what is missing. */
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
      doc.text(caption, x + w / 2, top + h / 2 + 1, { align: 'center' });
    }
  };


  const newPage = (first) => {
    if (!first) doc.addPage();
    return drawReportHeader(doc, {
      logo,
      title: 'Attendance Documents',
      subtitle: [dmy(dateStr), heading].filter(Boolean).join('   -   '),
    });
  };

  /** Who the guards are for, and how many of each category are on. */
  const drawSummary = (top) => {
    let line = top + 2;

    const row = (label, value, bold = true) => {
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...INK);
      doc.text(label, LEFT, line);
      doc.setFont('helvetica', bold ? 'bold' : 'normal').setTextColor(...INK);
      doc.text(text(value) || '-', LEFT + 36, line, { maxWidth: WIDTH - 70 });
      line += 6;
    };

    row('DATE AS OF :', longDate(dateStr), false);
    row(single ? 'NAME' : 'LOCATION', heading);
    if (single) row('GROUP', single.groupName, false);

    // The contract's span, which only a single client's record can give.
    if (client?.activeDate || client?.expiryDate) {
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...INK);
      doc.text('ACTIVATE', LEFT, line);
      doc.setFont('helvetica', 'normal');
      doc.text(dmy(client.activeDate), LEFT + 36, line);
      doc.setFont('helvetica', 'bold');
      doc.text('EXPIRY', LEFT + 118, line);
      doc.setFont('helvetica', 'normal');
      doc.text(dmy(client.expiryDate), LEFT + 140, line);
      line += 6;
    }

    row('STRENGTH', `${strength.total}      (Total)`);
    line += 1;

    // ------------------------------------------------- category by shift
    const cols = [WIDTH - 108, 36, 36, 36];
    const heads = ['Category', 'Day Shift', 'Night Shift', 'GUARDS'];
    const cellH = 6;

    const band = (values, bold, top2) => {
      let x = LEFT;
      values.forEach((value, i) => {
        doc.setDrawColor(...BORDER).setLineWidth(HAIRLINE);
        doc.rect(x, top2, cols[i], cellH);
        doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(8).setTextColor(...INK);
        if (i === 0) doc.text(text(value), x + 2, top2 + 4.2, { maxWidth: cols[i] - 4 });
        else doc.text(text(value), x + cols[i] / 2, top2 + 4.2, { align: 'center' });
        x += cols[i];
      });
      return top2 + cellH;
    };

    doc.setFillColor(...LABEL_BG);
    doc.rect(LEFT, line, cols.reduce((a, b) => a + b, 0), cellH, 'F');
    line = band(heads, true, line);

    strength.lines.forEach((entry) => {
      line = band([entry.category, entry.day || '', entry.night || '', entry.day + entry.night], false, line);
    });

    line = band(['', strength.day, strength.night, strength.total], true, line);

    return line + 6;
  };

  let y = drawSummary(newPage(true));

  rows.forEach((row, index) => {
    const data = documents.get(row.empId);
    const images = data?.images ?? {};
    const employee = data?.employee ?? {};

    // Only the guards who have book pages are given the room for them.
    const book = (images.dischargeBook ?? []).map(asDataUrl).filter(Boolean);
    const blockH = DETAIL_H + 2 + CNIC_H + (book.length ? 2 + BOOK_H : 0);

    const startsPage = y + blockH > BOTTOM;
    if (startsPage) y = newPage(false);

    // A dotted rule between one guard and the next, so two blocks on a page
    // read as two. The first block on a page needs none - the header is the
    // separator there.
    if (index > 0 && !startsPage) {
      doc.setDrawColor(...BORDER).setLineWidth(HAIRLINE);
      doc.setLineDashPattern([0.8, 1.2], 0);
      doc.line(LEFT, y - GAP / 2, RIGHT, y - GAP / 2);
      doc.setLineDashPattern([], 0);
    }

    const top = y;

    // ------------------------------------------------------- the details
    doc.setFillColor(...WHITE).setDrawColor(...BORDER).setLineWidth(HAIRLINE);
    doc.rect(LEFT, top, WIDTH, DETAIL_H, 'FD');

    // The serial, in a tinted square, as the legacy sheet numbers them.
    doc.setFillColor(...LABEL_BG);
    doc.rect(LEFT, top, 10, DETAIL_H, 'F');
    doc.setDrawColor(...BORDER).line(LEFT + 10, top, LEFT + 10, top + DETAIL_H);
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...NAVY);
    doc.text(String(index + 1), LEFT + 5, top + 8, { align: 'center' });

    const labelX = LEFT + 14;
    const valueX = LEFT + 34;
    let lineY = top + 7;

    const detail = (label, value) => {
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
      doc.text(label, labelX, lineY);
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...INK);
      doc.text(text(value) || '-', valueX, lineY, { maxWidth: 70 });
      lineY += 6.5;
    };

    detail('CLIENT', row.clientName);
    detail('NAME', cleanEmployeeName(row.employeeName || field(employee, 'FIRSTNAME', 'firstname')));
    detail('CNIC', field(employee, 'NIC', 'nic', 'ORIGCNIC'));
    detail('SHIFT', [row.shift, row.attendance].filter(Boolean).join('   /   '));

    // The employee number sits under the serial, where the eye looks for it.
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...MUTED);
    doc.text(String(row.empId), LEFT + 5, top + DETAIL_H - 3, { align: 'center' });

    // Photograph and signature, to the right of the details.
    scan(asDataUrl(images.photo), LEFT + 108, top + 1, 24, DETAIL_H - 2, 'No photograph');
    scan(asDataUrl(images.signature), LEFT + 134, top + 1, WIDTH - 135, DETAIL_H - 2, 'No signature');

    // ---------------------------------------------------------- the CNIC
    const half = (WIDTH - 2) / 2;
    scan(asDataUrl(images.cnicFront), LEFT, top + DETAIL_H + 2, half, CNIC_H, 'No CNIC front');
    scan(asDataUrl(images.cnicBack), LEFT + half + 2, top + DETAIL_H + 2, half, CNIC_H, 'No CNIC back');

    // ---------------------------------------------------------- the book
    if (book.length) {
      const bookY = top + DETAIL_H + 2 + CNIC_H + 2;
      // Always a quarter of the width, so a guard with one page gets a page
      // the size of everyone else's rather than one stretched across the row.
      const cell = (WIDTH - 3 * 2) / 4;
      book.forEach((page, n) => {
        scan(page, LEFT + n * (cell + 2), bookY, cell, BOOK_H, null);
      });

      doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...MUTED);
      doc.text('Discharge book', LEFT, bookY + BOOK_H + 3);
    }

    y = top + blockH + GAP;
  });

  // The page numbers, once everything is laid out and the count is known.
  const pages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...MUTED);
    doc.text(`Page ${page} of ${pages}`, RIGHT, PAGE_H - 6, { align: 'right' });
    doc.text(`${rows.length} guard${rows.length === 1 ? '' : 's'}`, LEFT, PAGE_H - 6);
  }

  return { url: doc.output('bloburl'), missing };
}

export default buildAttendanceDocumentsPdf;
