// ----------------------------------------------------------------------
// The masthead every attendance report carries: the logo, the company and
// its address, then the report's own title and period. Kept in one place so
// the parade state, the monthly parade state and the daily report cannot
// drift apart.
// ----------------------------------------------------------------------

export const COMPANY = 'Guards Mark Security';

export const ADDRESS =
  'Plot# C-1-C, Mezzanine Floor, Lane-1, Sehar Commercial, Phase-7, D.H.A, Karachi, Pakistan.';

/** The logo, or null - a missing file must never stop a report. */
export async function loadLogo() {
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

/**
 * Draws the masthead and returns the y the report's own content starts at.
 * `logo` is what loadLogo resolved to, loaded once and reused per page.
 */
export function drawReportHeader(doc, { logo, title, subtitle }) {
  const pageWidth = doc.internal.pageSize.getWidth();

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 12, 8, 22, 22);
    } catch {
      /* a missing logo must not stop the report */
    }
  }

  doc.setFont('helvetica', 'bold').setFontSize(15);
  doc.text(COMPANY, pageWidth / 2, 15, { align: 'center' });

  doc.setFont('helvetica', 'normal').setFontSize(7.5);
  doc.text(ADDRESS, pageWidth / 2, 20, { align: 'center' });

  doc.setFont('helvetica', 'bold').setFontSize(11);
  doc.text(title, pageWidth / 2, 27, { align: 'center' });

  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, pageWidth / 2, 32, { align: 'center' });
    return 36;
  }

  return 31;
}
