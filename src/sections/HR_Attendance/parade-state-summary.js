import autoTable from 'jspdf-autotable';

// ---------------------------------------------------------------------------
// The summary block the legacy parade state prints beneath the sheet: what the
// contracts call for against what actually stood on post, split day / night.
//
//   guarding strength = standard duty + overtime
//   shortage          = contract - guarding strength, floored at zero
//
// EP strength has no source anywhere in the system, so that row prints blank -
// exactly as the legacy report leaves it - rather than a made-up zero.
// ---------------------------------------------------------------------------

const num = (v) => Number(v || 0);
const atLeastZero = (n) => (n > 0 ? n : 0);

const pair = (day, night) => ({ day: num(day), night: num(night) });

/**
 * Builds the six summary lines from the three figures that drive them.
 * Each of contract / standard / overtime is a { day, night } pair.
 */
export function paradeSummaryRows({ contract, standard, overtime }) {
  const guarding = pair(standard.day + overtime.day, standard.night + overtime.night);
  const shortage = pair(
    atLeastZero(contract.day - guarding.day),
    atLeastZero(contract.night - guarding.night)
  );

  return [
    { label: 'TOTAL STRENGTH (CONTRACT)', value: pair(contract.day, contract.night) },
    { label: 'TOTAL STRENGTH (STANDARD DUTY)', value: pair(standard.day, standard.night) },
    { label: 'TOTAL OVER TIME', value: pair(overtime.day, overtime.night) },
    { label: 'TOTAL SHORTAGE', value: shortage },
    { label: 'TOTAL GUARDING STRENGTH', value: guarding },
    // No EP data is captured yet; the row is printed for the form's sake.
    { label: 'TOTAL EP STRENGTH', value: null },
  ];
}

/**
 * Draws the summary table. It is kept whole: if the page cannot hold it, it
 * moves to a fresh one rather than splitting across the break.
 */
export function drawParadeSummary(doc, { rows, startY, margin = 8, caption = '' }) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const needed = 7 + rows.length * 5.6 + (caption ? 5 : 0);

  let y = startY;
  if (y + needed > pageHeight - 14) {
    doc.addPage();
    y = 16;
  }

  if (caption) {
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(90, 95, 105);
    doc.text(caption, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 3.5;
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: 122,
    head: [['SUMMARY', 'D', 'N', 'Total']],
    body: rows.map(({ label, value }) =>
      value
        ? [`${label} :`, String(value.day), String(value.night), String(value.day + value.night)]
        : [`${label} :`, '', '', '']
    ),
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.4,
      lineColor: [80, 80, 80],
      lineWidth: 0.1,
      textColor: [33, 43, 54],
    },
    headStyles: {
      fillColor: [208, 212, 217],
      textColor: [33, 43, 54],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 62, halign: 'right', fontStyle: 'bold' },
      1: { cellWidth: 20, halign: 'right' },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 20, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const label = rows[data.row.index]?.label;
      if (label === 'TOTAL SHORTAGE' && Number(data.cell.raw) > 0) {
        data.cell.styles.textColor = [183, 29, 24];
        data.cell.styles.fontStyle = 'bold';
      }
      if (label === 'TOTAL GUARDING STRENGTH') data.cell.styles.fontStyle = 'bold';
    },
  });

  return doc.lastAutoTable.finalY;
}
