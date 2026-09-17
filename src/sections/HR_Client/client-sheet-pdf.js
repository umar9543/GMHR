import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ----------------------------------------------------------------------
// Company Details sheet: the client's details, the guards entered for the
// date on screen, the recent guard history and the company allowance.
// ----------------------------------------------------------------------

const COMPANY = 'GUARDS MARK SECURITY SERVICES (PVT) LTD';
const NAVY = [23, 43, 77];
const MUTED = [95, 104, 119];
const LABEL_BG = [242, 244, 247];

const pad = (n) => String(n).padStart(2, '0');

function toDate(value) {
  if (value instanceof Date) return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

function fmtDate(value) {
  const d = toDate(value);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '-';
}

const yesNo = (v) => (v ? 'Yes' : 'No');
const money = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

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

export async function buildClientSheetPdf({ form, rows, totals, versions, allowances }) {
  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 10;

  const logo = await loadLogo();
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', left, 8, 18, 18);
    } catch {
      /* the sheet must survive a missing logo */
    }
  }

  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...NAVY);
  doc.text(COMPANY, left + 23, 15);
  doc.setFont('helvetica', 'normal').setFontSize(10.5).setTextColor(...MUTED);
  doc.text('Company Details', left + 23, 21.5, { charSpace: 0.3 });
  doc.setDrawColor(...NAVY).setLineWidth(0.6).line(left, 29, pageWidth - left, 29);

  const band = (label, y) => {
    doc.setFillColor(...NAVY).rect(left, y, pageWidth - left * 2, 6, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(8.4).setTextColor(255, 255, 255);
    doc.text(label.toUpperCase(), left + 3, y + 4.1, { charSpace: 0.3 });
    return y + 6;
  };

  const details = [
    ['Customer', form.name || '-', 'Daily Date', fmtDate(form.dailyDate)],
    ['Group Name', form.group?.name || '-', 'Contract Code', form.contractCode || '-'],
    ['Activation Date', fmtDate(form.activeDate), 'Contract Closed', yesNo(form.isClosed)],
    ['Expiry Date', fmtDate(form.expiryDate), 'Expiry Date 2', fmtDate(form.expiryDate2)],
    ['Day / Night Food', `${yesNo(form.dayFood)} / ${yesNo(form.nightFood)}`, '', ''],
    ['Company Allowance', money(form.compAllow), 'OT Client Amount', `${money(form.otAmount)}${form.otChk ? '  (on)' : ''}`],
  ];

  let y = band('Client', 34);
  autoTable(doc, {
    startY: y,
    margin: { left, right: left },
    body: details,
    theme: 'grid',
    styles: { fontSize: 8.2, cellPadding: 1.8, lineColor: [178, 186, 199], lineWidth: 0.15 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: LABEL_BG, textColor: MUTED, cellWidth: 34 },
      1: { cellWidth: 61 },
      2: { fontStyle: 'bold', fillColor: LABEL_BG, textColor: MUTED, cellWidth: 34 },
      3: { cellWidth: 61 },
    },
  });

  y = band(`Guards required on ${fmtDate(form.dailyDate)}`, doc.lastAutoTable.finalY + 5);
  const guardRows = (rows || []).filter((r) => String(r.rank || '').trim());
  autoTable(doc, {
    startY: y,
    margin: { left, right: left },
    head: [['Rank', 'Day Guards', 'Night Guards', 'Total', 'Overtime Rate']],
    body: guardRows.length
      ? guardRows.map((r) => [r.rank, r.requiredDay, r.requiredNight, r.totalGuards, money(r.overtimeRate)])
      : [['No ranks entered', '', '', '', '']],
    foot: [['Total', totals.day, totals.night, totals.total, '']],
    theme: 'grid',
    styles: { fontSize: 8.2, cellPadding: 1.8, lineColor: [178, 186, 199], lineWidth: 0.15 },
    headStyles: { fillColor: LABEL_BG, textColor: MUTED },
    footStyles: { fillColor: LABEL_BG, textColor: [17, 24, 39] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'right' } },
  });

  if (versions?.length) {
    y = band('Guard History (most recent)', doc.lastAutoTable.finalY + 5);
    autoTable(doc, {
      startY: y,
      margin: { left, right: left },
      head: [['Daily Date', 'Day', 'Night', 'Total', 'Guards per rank (day/night)']],
      body: versions.map((v) => [
        fmtDate(v.dailyDate),
        v.totalDay,
        v.totalNight,
        v.totalGuards,
        (v.ranks || [])
          .filter((r) => r.totalGuards || r.requiredDay || r.requiredNight)
          .map((r) => `${r.rank} ${r.requiredDay}/${r.requiredNight}`)
          .join(', ') || 'No guards',
      ]),
      theme: 'grid',
      styles: { fontSize: 7.6, cellPadding: 1.5, lineColor: [178, 186, 199], lineWidth: 0.15 },
      headStyles: { fillColor: LABEL_BG, textColor: MUTED },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { halign: 'center', cellWidth: 12 },
        2: { halign: 'center', cellWidth: 12 },
        3: { halign: 'center', cellWidth: 12 },
      },
    });
  }

  if (allowances?.length) {
    y = band('Company Allowance', doc.lastAutoTable.finalY + 5);
    autoTable(doc, {
      startY: y,
      margin: { left, right: left },
      tableWidth: 90,
      head: [['Date', 'Amount']],
      body: allowances.map((a) => [fmtDate(a.allowDate), money(a.amount)]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.6, lineColor: [178, 186, 199], lineWidth: 0.15 },
      headStyles: { fillColor: LABEL_BG, textColor: MUTED },
      columnStyles: { 1: { halign: 'right' } },
    });
  }

  const pages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...MUTED);
    doc.text(COMPANY, left, pageHeight - 7);
    doc.text(`Page ${page} of ${pages}`, pageWidth - left, pageHeight - 7, { align: 'right' });
  }

  return doc.output('bloburl');
}

export default buildClientSheetPdf;
