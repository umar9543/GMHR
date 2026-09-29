import { writeFileSync, readFileSync } from 'node:fs';
const src = readFileSync('./src/sections/HR_Attendance/daily-employee-pdf.js', 'utf8')
  .replace("return doc.output('bloburl');", "return doc.output('arraybuffer');");
writeFileSync('./daily-employee-pdf.node.mjs', src);
const { buildDailyEmployeePdf } = await import('./daily-employee-pdf.node.mjs');
const res = await fetch('http://localhost:7099/api/Report/DailyByEmployee?date=2026-09-17&clientIds=438');
const { records } = await res.json();
const buf = await buildDailyEmployeePdf(records, '2026-09-17');
writeFileSync(`${process.argv[2]}/daily-employee.pdf`, Buffer.from(buf));
console.log('rows', records.length, '- wrote');
