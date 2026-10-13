import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

// ---------------------------------------------------------------------------
// The chart of accounts as the legacy Allocation List: every chart heading,
// its accounts and their sub-ledgers, in code order, indented by level.
//
//   1        ----  NON CURRENT ASSETS          level 1, a chart heading
//   1   31        --------  VEHICLES            level 2, an account
//   1   31   1         ---------  RAVI CN-7034  level 3, a sub-ledger
//
// The PDF follows the legacy printout - US Letter, the company in a large
// serif, "Allocation List As At" in a typewriter face, a rule leading into
// each name. The spreadsheet carries the same rows with the codes in their
// own columns, so it can be sorted and filtered.
// ---------------------------------------------------------------------------

const COMPANY = 'GUARDS MARK SECURITY SERVICES (PVT) LTD.';

const dmy = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const text = (v) => String(v ?? '').trim();

// Points, on a 612 x 792 Letter page - measured off the legacy printout.
const PAGE = {
  width: 612,
  height: 792,
  firstRow: 82,
  lastRow: 772,
  step: 12,
};

// Where each code sits (right edge) and where each level's rule and name go.
const CODE_RIGHT = { ca: 32, ac: 62, sub: 86 };
const LEVEL = {
  1: { ruleFrom: 66, ruleTo: 101, name: 103 },
  2: { ruleFrom: 82, ruleTo: 154, name: 160 },
  3: { ruleFrom: 102, ruleTo: 168, name: 180 },
};

/** The Allocation List as a PDF, returned as a blob URL. */
export function buildAllocationListPdf(rows, asAt = new Date()) {
  // eslint-disable-next-line new-cap -- jsPDF is the library's own exported name
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  const header = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont('times', 'bold').setFontSize(19);
    doc.text(COMPANY, PAGE.width / 2, 38, { align: 'center' });
    doc.setFont('courier', 'normal').setFontSize(8.5);
    doc.text(`Allocation List As At ${dmy(asAt)}`, PAGE.width / 2, 52, { align: 'center' });
    doc.setFont('times', 'bold').setFontSize(9);
    doc.text('DESCRIPTION', 34, 70);
  };

  header();
  let y = PAGE.firstRow;

  rows.forEach((row) => {
    if (y > PAGE.lastRow) {
      doc.addPage();
      header();
      y = PAGE.firstRow;
    }

    const level = LEVEL[row.level] ? row.level : 3;
    const place = LEVEL[level];

    doc.setFont('times', 'normal').setFontSize(9);
    doc.text(String(row.caCode ?? ''), CODE_RIGHT.ca, y, { align: 'right' });
    if (level >= 2 && row.acCode != null) doc.text(String(row.acCode), CODE_RIGHT.ac, y, { align: 'right' });
    if (level >= 3 && row.subCode != null) doc.text(String(row.subCode), CODE_RIGHT.sub, y, { align: 'right' });

    // The rule that leads the eye from the codes into the name.
    doc.setDrawColor(0, 0, 0).setLineWidth(0.7);
    doc.line(place.ruleFrom, y - 3, place.ruleTo, y - 3);

    // Names are cut to the page rather than wrapped, as the legacy list does.
    const maxWidth = PAGE.width - 30 - place.name;
    const name = doc.splitTextToSize(text(row.description), maxWidth)[0] || '';
    doc.text(name, place.name, y);

    y += PAGE.step;
  });

  // The page count, once it is known.
  const pages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont('times', 'normal').setFontSize(7.5).setTextColor(90, 90, 90);
    doc.text(`Page ${page} of ${pages}`, PAGE.width - 30, PAGE.height - 10, { align: 'right' });
  }

  return doc.output('bloburl');
}

/** The same list as an .xlsx file, downloaded. */
export function downloadAllocationListExcel(rows, asAt = new Date()) {
  const TYPE = { 1: 'Chart', 2: 'Account', 3: 'Sub Ledger' };

  const aoa = [
    [COMPANY],
    [`Allocation List As At ${dmy(asAt)}`],
    [],
    ['Chart', 'Account', 'Sub Ledger', 'Code', 'Description', 'Type'],
    ...rows.map((row) => [
      row.caCode ?? '',
      row.level >= 2 ? row.acCode ?? '' : '',
      row.level >= 3 ? row.subCode ?? '' : '',
      [row.caCode, row.level >= 2 ? row.acCode : null, row.level >= 3 ? row.subCode : null]
        .filter((v) => v != null && v !== '')
        .join('-'),
      // Indented by level, so the tree still reads as a tree in the sheet.
      `${'    '.repeat(Math.max(0, (row.level || 1) - 1))}${text(row.description)}`,
      TYPE[row.level] || '',
    ]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet['!cols'] = [{ wch: 7 }, { wch: 9 }, { wch: 11 }, { wch: 11 }, { wch: 52 }, { wch: 11 }];
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
  ];
  // Header row frozen and filterable, so the sheet can be searched by level.
  sheet['!autofilter'] = { ref: `A4:F${aoa.length}` };
  sheet['!freeze'] = { xSplit: 0, ySplit: 4 };

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Allocation List');

  const stamp = asAt.toISOString().slice(0, 10);
  XLSX.writeFile(book, `Chart of Accounts - Allocation List ${stamp}.xlsx`);
}
