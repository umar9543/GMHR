import {
  Tab,
  Table,
  Header,
  Footer,
  Packer,
  TextRun,
  Document,
  ImageRun,
  TableRow,
  TableCell,
  Paragraph,
  WidthType,
  PageNumber,
  HeightRule,
  BorderStyle,
  ShadingType,
  TabStopType,
  AlignmentType,
  VerticalAlign,
} from 'docx';

import { cleanEmployeeName } from 'src/utils/employee-name';

import { COMPANY, ADDRESS, loadLogo } from './report-header';
import { dmy, text, field, asImage, longDate, prepareAttendanceDocuments } from './attendance-documents-data';

// ---------------------------------------------------------------------------
// The Attendance Documents report as a Word file: the same summary and the
// same one-block-per-guard layout as the PDF, built from the same data, but
// as real tables so the office can edit it, add a note, or pull a page out.
//
// Word lays its own pages out, so a block is held together by "keep with
// next" on every line of it rather than by measuring - a guard's block moves
// to the next page whole instead of breaking across two.
// ---------------------------------------------------------------------------

// A4, ten millimetre margins - the same frame as the PDF.
const MM = 56.7; // twips per millimetre
const PX = 3.7795; // pixels per millimetre, at Word's 96 dpi
const PAGE_W = 210;
const MARGIN = 10;
const WIDTH = PAGE_W - MARGIN * 2;

const NAVY = '172B4D';
const INK = '111827';
const MUTED = '5F6877';
const LABEL_BG = 'F2F4F7';
const BORDER = 'B2BAC7';

const FONT = 'Arial';

// The block's parts, in millimetres, as the PDF draws them.
const DETAIL_H = 32;
const CNIC_H = 55;
const BOOK_H = 34;

const twips = (mm) => Math.round(mm * MM);

const line = { style: BorderStyle.SINGLE, size: 4, color: BORDER };
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const framed = { top: line, bottom: line, left: line, right: line };
const bare = { top: none, bottom: none, left: none, right: none };
const tableBare = { ...bare, insideHorizontal: none, insideVertical: none };
const tableFramed = { ...framed, insideHorizontal: line, insideVertical: line };

const run = (value, { size = 9, bold = false, color = INK } = {}) =>
  new TextRun({ text: text(value), size: size * 2, bold, color, font: FONT });

/** A scan sized to its frame, or what is missing in its place. */
function picture(base64, widthMm, heightMm, caption) {
  const image = asImage(base64);
  // Word cannot show WebP; it is treated as a missing scan rather than a
  // broken picture.
  if (image && image.type !== 'webp') {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      children: [
        new ImageRun({
          type: image.type,
          data: image.bytes,
          transformation: {
            width: Math.round(widthMm * PX),
            height: Math.round(heightMm * PX),
          },
        }),
      ],
    });
  }
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    keepNext: true,
    children: caption ? [run(caption, { size: 7, color: MUTED })] : [],
  });
}

const cell = (children, widthMm, extra = {}) =>
  new TableCell({
    width: { size: twips(widthMm), type: WidthType.DXA },
    borders: framed,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children,
    ...extra,
  });

const table = (rows, widthsMm, borders = tableFramed) =>
  new Table({
    width: { size: twips(WIDTH), type: WidthType.DXA },
    columnWidths: widthsMm.map(twips),
    borders,
    rows,
  });

/** One row that Word may not split across a page. */
const row = (cells, heightMm) =>
  new TableRow({
    cantSplit: true,
    height: heightMm ? { value: twips(heightMm), rule: HeightRule.ATLEAST } : undefined,
    children: cells,
  });

const gap = (mm, keepNext = true) =>
  new Paragraph({ keepNext, spacing: { before: 0, after: twips(mm) }, children: [] });

// ------------------------------------------------------------------ masthead

function masthead(logo, heading, dateStr) {
  const logoImage = logo ? asImage(logo.split(',')[1]) : null;

  const top = table(
    [
      new TableRow({
        children: [
          new TableCell({
            width: { size: twips(25), type: WidthType.DXA },
            borders: bare,
            children: [
              logoImage
                ? new Paragraph({
                    children: [
                      new ImageRun({
                        type: logoImage.type,
                        data: logoImage.bytes,
                        transformation: { width: Math.round(20 * PX), height: Math.round(20 * PX) },
                      }),
                    ],
                  })
                : new Paragraph({ children: [] }),
            ],
          }),
          new TableCell({
            width: { size: twips(WIDTH - 50), type: WidthType.DXA },
            borders: bare,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [run(COMPANY, { size: 15, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [run(ADDRESS, { size: 7.5 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: twips(25), type: WidthType.DXA },
            borders: bare,
            children: [new Paragraph({ children: [] })],
          }),
        ],
      }),
    ],
    [25, WIDTH - 50, 25],
    tableBare
  );

  return new Header({
    children: [
      top,
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60 },
        children: [run('Attendance Documents', { size: 11, bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [run([dmy(dateStr), heading].filter(Boolean).join('   -   '), { size: 9, bold: true })],
      }),
    ],
  });
}

function pageFooter(count) {
  return new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: twips(WIDTH) }],
        children: [
          run(`${count} guard${count === 1 ? '' : 's'}`, { size: 7, color: MUTED }),
          new TextRun({
            children: ['\tPage ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
            size: 14,
            color: MUTED,
            font: FONT,
          }),
        ],
      }),
    ],
  });
}

// ------------------------------------------------------------------- summary

function summary({ dateStr, single, client, heading, strength }) {
  const widths = [36, 82, 22, WIDTH - 140];

  const pair = (label, value, bold = true) => [
    cell([new Paragraph({ children: [run(label, { bold: true })] })], widths[0], { borders: bare }),
    cell([new Paragraph({ children: [run(text(value) || '-', { bold })] })], widths[1], { borders: bare }),
  ];
  const empty = (w) => cell([new Paragraph({ children: [] })], w, { borders: bare });

  const lines = [
    [...pair('DATE AS OF :', longDate(dateStr), false), empty(widths[2]), empty(widths[3])],
    [...pair(single ? 'NAME' : 'LOCATION', heading), empty(widths[2]), empty(widths[3])],
  ];
  if (single) {
    lines.push([...pair('GROUP', single.groupName, false), empty(widths[2]), empty(widths[3])]);
  }
  // The contract's span, which only a single client's record can give.
  if (client?.activeDate || client?.expiryDate) {
    lines.push([
      ...pair('ACTIVATE', dmy(client.activeDate), false),
      cell([new Paragraph({ children: [run('EXPIRY', { bold: true })] })], widths[2], { borders: bare }),
      cell([new Paragraph({ children: [run(dmy(client.expiryDate))] })], widths[3], { borders: bare }),
    ]);
  }
  lines.push([...pair('STRENGTH', `${strength.total}      (Total)`), empty(widths[2]), empty(widths[3])]);

  const details = table(
    lines.map((cells) => new TableRow({ children: cells })),
    widths,
    tableBare
  );

  // ------------------------------------------------- category by shift
  const cols = [WIDTH - 108, 36, 36, 36];
  const band = (values, { bold = false, shade = false } = {}) =>
    new TableRow({
      children: values.map((value, i) =>
        cell(
          [
            new Paragraph({
              alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
              children: [run(value, { size: 8, bold })],
            }),
          ],
          cols[i],
          shade ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: LABEL_BG } } : {}
        )
      ),
    });

  const shifts = table(
    [
      band(['Category', 'Day Shift', 'Night Shift', 'GUARDS'], { bold: true, shade: true }),
      ...strength.lines.map((entry) =>
        band([entry.category, entry.day || '', entry.night || '', entry.day + entry.night])
      ),
      band(['', strength.day, strength.night, strength.total], { bold: true }),
    ],
    cols
  );

  return [details, gap(2, false), shifts, gap(6, false)];
}

// --------------------------------------------------------------- the guards

function guardBlock(guard, data, index, isLast) {
  const images = data?.images ?? {};
  const employee = data?.employee ?? {};
  const book = (images.dischargeBook ?? []).filter(Boolean);

  // Every line of the details, held to the CNIC row beneath it.
  const detail = (label, value) =>
    new Paragraph({
      keepNext: true,
      spacing: { after: 60 },
      tabStops: [{ type: TabStopType.LEFT, position: twips(18) }],
      children: [
        run(label, { size: 8, color: MUTED }),
        // A real tab, not a tab character: the shared text helper trims, which
        // would swallow one and run the label into its value.
        new TextRun({ children: [new Tab(), text(value) || '-'], bold: true, size: 18, color: INK, font: FONT }),
      ],
    });

  const details = table(
    [
      row(
        [
          cell(
            [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                keepNext: true,
                children: [run(index + 1, { size: 10, bold: true, color: NAVY })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                keepNext: true,
                spacing: { before: twips(12) },
                children: [run(guard.empId, { size: 7, color: MUTED })],
              }),
            ],
            10,
            {
              shading: { type: ShadingType.CLEAR, color: 'auto', fill: LABEL_BG },
              verticalAlign: VerticalAlign.TOP,
            }
          ),
          cell(
            [
              detail('CLIENT', guard.clientName),
              detail('NAME', cleanEmployeeName(guard.employeeName || field(employee, 'FIRSTNAME', 'firstname'))),
              detail('CNIC', field(employee, 'NIC', 'nic', 'ORIGCNIC')),
              detail('SHIFT', [guard.shift, guard.attendance].filter(Boolean).join('   /   ')),
            ],
            96
          ),
          cell([picture(images.photo, 24, DETAIL_H - 4, 'No photograph')], 26),
          cell([picture(images.signature, WIDTH - 136 - 4, DETAIL_H - 4, 'No signature')], WIDTH - 132),
        ],
        DETAIL_H
      ),
    ],
    [10, 96, 26, WIDTH - 132]
  );

  const half = WIDTH / 2;
  const cnic = table(
    [
      row(
        [
          cell([picture(images.cnicFront, half - 3, CNIC_H, 'No CNIC front')], half),
          cell([picture(images.cnicBack, half - 3, CNIC_H, 'No CNIC back')], half),
        ],
        CNIC_H
      ),
    ],
    [half, half]
  );

  const parts = [details, gap(1.5), cnic];

  // Only the guards who have book pages are given the row for them, and the
  // pages are always a quarter of the width, so one page looks like one page.
  if (book.length) {
    const quarter = WIDTH / 4;
    const pages = [0, 1, 2, 3].map((n) =>
      book[n]
        ? cell([picture(book[n], quarter - 3, BOOK_H, null)], quarter)
        : cell([new Paragraph({ keepNext: true, children: [] })], quarter, { borders: bare })
    );
    parts.push(
      gap(1.5),
      table([row(pages, BOOK_H)], [quarter, quarter, quarter, quarter]),
      new Paragraph({
        keepNext: !isLast,
        children: [run('Discharge book', { size: 6.5, color: MUTED })],
      })
    );
  }

  // A dotted rule between one guard and the next, with room either side.
  if (!isLast) {
    parts.push(
      new Paragraph({
        spacing: { before: twips(4), after: twips(4) },
        border: { bottom: { style: BorderStyle.DOTTED, size: 6, color: BORDER, space: 1 } },
        children: [],
      })
    );
  }

  return parts;
}

// ------------------------------------------------------------------ the file

export async function buildAttendanceDocumentsDocx(rows, dateStr, options = {}) {
  const prepared = await prepareAttendanceDocuments(rows, options);
  const logo = await loadLogo();

  const body = [
    ...summary({ dateStr, ...prepared }),
    ...rows.flatMap((guard, index) =>
      guardBlock(guard, prepared.documents.get(guard.empId), index, index === rows.length - 1)
    ),
  ];

  const doc = new Document({
    creator: COMPANY,
    title: 'Attendance Documents',
    styles: { default: { document: { run: { font: FONT, size: 18 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: twips(PAGE_W), height: twips(297) },
            margin: {
              top: twips(MARGIN),
              bottom: twips(MARGIN),
              left: twips(MARGIN),
              right: twips(MARGIN),
              header: twips(6),
              footer: twips(5),
            },
          },
        },
        headers: { default: masthead(logo, prepared.heading, dateStr) },
        footers: { default: pageFooter(rows.length) },
        children: body,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);

  const day = new Date(dateStr);
  const stamp = Number.isNaN(day.getTime()) ? text(dateStr) : day.toISOString().slice(0, 10);
  const name = [`Attendance Documents`, prepared.heading, stamp]
    .filter(Boolean)
    .join(' - ')
    .replace(/[\\/:*?"<>|]+/g, ' ');

  return { blob, filename: `${name}.docx`, missing: prepared.missing };
}

export default buildAttendanceDocumentsDocx;
