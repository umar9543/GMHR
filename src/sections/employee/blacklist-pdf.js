import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { blackListPictureUrl } from 'src/api/blacklist';

import { loadLogo, drawReportHeader } from '../HR_Attendance/report-header';

// ----------------------------------------------------------------------
// The black list on paper: one line a person - code, date, CNIC, name,
// father's name, address, charges, the security company he came from - and
// his photo where there is one. Used for the whole list and for one entry.
// ----------------------------------------------------------------------

const BATCH = 6;

async function loadPhoto(personId) {
  try {
    const res = await fetch(blackListPictureUrl(personId));
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    const scale = Math.min(120 / bitmap.width, 140 / bitmap.height, 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return { url: canvas.toDataURL('image/jpeg', 0.85), w: canvas.width, h: canvas.height };
  } catch {
    return null;
  }
}

const dmy = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/**
 * @param rows     people from getBlackList / getBlackListEntry
 * @param options  title, subtitle, onProgress(done, total)
 * @returns a blob URL
 */
export async function buildBlackListPdf(rows, { title = 'BLACK LISTING OF GUARDS / EMPLOYEES', subtitle = '', onProgress } = {}) {
  if (!rows?.length) throw new Error('There is nobody to print');

  const photos = new Map();
  const wanted = rows.filter((r) => r.hasPicture && r.personId);
  for (let i = 0; i < wanted.length; i += BATCH) {
    const slice = wanted.slice(i, i + BATCH);
    // eslint-disable-next-line no-await-in-loop
    const loaded = await Promise.all(slice.map((r) => loadPhoto(r.personId)));
    slice.forEach((r, n) => loaded[n] && photos.set(r.personId, loaded[n]));
    onProgress?.(Math.min(i + BATCH, wanted.length), wanted.length);
  }

  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logo = await loadLogo();
  const startY = drawReportHeader(doc, { logo, title, subtitle });

  const withPhotos = photos.size > 0;
  const PHOTO_COL = 9;
  const body = rows.map((r, i) => {
    const line = [
      String(i + 1),
      String(r.code ?? ''),
      dmy(r.date),
      r.cnic || '-',
      r.employeeName || '-',
      r.fatherName || '-',
      r.address || '-',
      r.charges || '-',
      r.exSecurityCompany || '-',
    ];
    if (withPhotos) line.push({ content: '', personId: r.personId });
    return line;
  });

  autoTable(doc, {
    startY: startY + 2,
    head: [
      [
        'S.N',
        'Code',
        'Date',
        'CNIC',
        'Name',
        'Father Name',
        'Address',
        'Charges',
        'Ex-Security Company',
        ...(withPhotos ? ['Picture'] : []),
      ],
    ],
    body,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.2, valign: 'top', lineColor: [80, 80, 80], lineWidth: 0.1 },
    headStyles: { fillColor: [33, 43, 54], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 17, halign: 'center' },
      3: { cellWidth: 26 },
      4: { cellWidth: 30 },
      5: { cellWidth: 28 },
      6: { cellWidth: 'auto' },
      7: { cellWidth: 46 },
      8: { cellWidth: 32 },
      ...(withPhotos ? { 9: { cellWidth: 18, minCellHeight: 20 } } : {}),
    },
    didParseCell: (data) => {
      // A line with a photo is tall enough to show it.
      if (withPhotos && data.section === 'body' && photos.has(data.row.raw?.[PHOTO_COL]?.personId)) {
        data.cell.styles.minCellHeight = 21;
      }
    },
    didDrawCell: (data) => {
      if (!withPhotos || data.section !== 'body' || data.column.index !== PHOTO_COL) return;
      const photo = photos.get(data.cell.raw?.personId);
      if (!photo) return;
      const scale = Math.min((data.cell.width - 1) / photo.w, (data.cell.height - 1) / photo.h);
      const w = photo.w * scale;
      const h = photo.h * scale;
      try {
        doc.addImage(photo.url, 'JPEG', data.cell.x + (data.cell.width - w) / 2, data.cell.y + 0.5, w, h);
      } catch {
        /* a broken photo leaves the box empty */
      }
    },
    margin: { left: 8, right: 8, bottom: 12 },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal').setFontSize(7);
    doc.text(`${rows.length} person(s)`, 8, pageHeight - 6);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 8, pageHeight - 6, { align: 'right' });
  }

  return doc.output('bloburl');
}

export default buildBlackListPdf;
