import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { cleanEmployeeName } from 'src/utils/employee-name';

import { loadPhotos } from './employee-photos';

// ----------------------------------------------------------------------
// Employee Category Wise, as the legacy report prints it: the company name,
// then one line per guard - serial, company code, name, job title, civil or
// ex-armed, CNIC, location - with his photo in the last box. Guards come
// client by client, job title by job title, code by code.
// ----------------------------------------------------------------------

const COMPANY = 'Guards Mark Security Services (Pvt) Ltd.';
/**
 * @param rows     records from getEmployeeCategoryWise
 * @param options  { dateLabel: 'dd/mm/yyyy', onProgress(done, total) }
 * @returns { url, missing } - the PDF's blob URL and how many had no photo
 */
export async function buildEmployeeCategoryWisePdf(rows, { dateLabel = '', onProgress } = {}) {
  if (!rows?.length) throw new Error('There are no guards to report');

  const photos = await loadPhotos(rows, { onProgress });

  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  doc.setFont('times', 'normal').setFontSize(18);
  doc.text(COMPANY, pageWidth / 2, 13, { align: 'center' });
  if (dateLabel) {
    doc.setFontSize(9);
    doc.text(`Employee Category Wise - ${dateLabel}`, pageWidth - margin, 18, { align: 'right' });
  }

  const PHOTO_COL = 7;
  const body = rows.map((r, i) => [
    String(i + 1),
    String(r.empId),
    cleanEmployeeName(r.employeeName) || `Employee ${r.empId}`,
    r.jobTitle || '-',
    r.serviceType || '-',
    r.nic || '-',
    r.clientName || '-',
    // The photo box carries whose photo it is: autoTable's row index does not
    // follow this list once the table runs past a page.
    { content: '', empId: r.empId },
  ]);

  autoTable(doc, {
    startY: 20,
    head: [['S No.', 'Comp ID', 'Employee Name', 'Job Title', 'Civil/\nEx-Armed', 'NIC', 'Location', 'PIC Box']],
    body,
    theme: 'grid',
    margin: { left: margin, right: margin, top: 12, bottom: 14 },
    styles: {
      font: 'times',
      fontSize: 8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      cellPadding: { top: 2.5, bottom: 1.5, left: 1.5, right: 1.5 },
      valign: 'top',
      minCellHeight: 25,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'top',
      minCellHeight: 10,
    },
    columnStyles: {
      // 190 mm across; the location takes what is left, about 37 mm.
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 37 },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 18, halign: 'center', fontSize: 9 },
      5: { cellWidth: 26, halign: 'center' },
      6: { cellWidth: 'auto' },
      7: { cellWidth: 24 },
    },
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== PHOTO_COL) return;
      const photo = photos.get(data.cell.raw?.empId);
      if (!photo) return;
      // Fitted inside the box, keeping its shape.
      const boxW = data.cell.width - 1;
      const boxH = data.cell.height - 1;
      const scale = Math.min(boxW / photo.w, boxH / photo.h);
      const w = photo.w * scale;
      const h = photo.h * scale;
      try {
        doc.addImage(photo.url, 'JPEG', data.cell.x + (data.cell.width - w) / 2, data.cell.y + 0.5, w, h);
      } catch {
        /* a broken photo leaves the box empty */
      }
    },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('times', 'normal').setFontSize(9);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
    doc.text(`${rows.length} guards`, margin, pageHeight - 6);
  }

  return { url: doc.output('bloburl'), missing: rows.length - photos.size };
}

export default buildEmployeeCategoryWisePdf;
