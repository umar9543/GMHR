/* eslint-disable no-restricted-globals */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
};

self.onmessage = async (e) => {
    const { reportData, currentMonth, type } = e.data;

    if (type === 'init') {
        self.postMessage({ type: 'ready' });
        return;
    }

    try {
        const totalRows = reportData.length;
        // eslint-disable-next-line new-cap
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Fetch Logo
        let logoBase64 = null;
        let logoWidth = 60;
        let logoHeight = 25;
        try {
            const response = await fetch('/assets/images/gms.png');
            if (response.ok) {
                const blob = await response.blob();

                try {
                    const bmp = await createImageBitmap(blob);
                    const aspectRatio = bmp.width / bmp.height;
                    logoHeight = 25;
                    logoWidth = logoHeight * aspectRatio;
                } catch (err) {
                    console.warn('Could not get image dimensions', err);
                }

                logoBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }
        } catch (err) {
            console.warn('Could not load logo', err);
        }

        // Add Logo
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', 10, 5, logoWidth, logoHeight);
        }

        // Company Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Guards Mark Security', pageWidth / 2, 15, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
            'Plot# C-1-C, Mezzanine Floor, Lane-1, Sehar Commercial, Phase-7, D.H.A, Karachi, Pakistan.',
            pageWidth / 2,
            22,
            { align: 'center' }
        );

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');

        const titleText = `Salary For The Month Of ${formatDate(currentMonth)}`;

        // 1. Draw the text
        doc.text(titleText, pageWidth / 2, 35, { align: 'center' });

        // 2. Calculate the exact width of the text
        const textWidth = doc.getTextWidth(titleText);

        // 3. Draw a line under it (doc.line(x1, y1, x2, y2))
        // We start from the center minus half the width, and draw to the center plus half the width
        // The Y coordinate is 36 (1mm below the text which is at Y=35)
        doc.setLineWidth(0.5); // Thickness of the underline
        doc.line(
            (pageWidth / 2) - (textWidth / 2),
            36,
            (pageWidth / 2) + (textWidth / 2),
            36
        );

        // Prepare headers (excluding FSL-Code)
        const headers = [
            'S.no',
            'NAME',
            'CNIC',
            'Monthly\nSALARY',
            'Days',
            'Absent\nDays',
            'PAY/\nDAYS',
            'SALARY/\nMONTH',
            'DEDUCT\nAMOUNT',
            'NET/\nSALARY',
            'O.T\nRATE',
            'WORK\nHOURS',
            'TOTAL\nO.T',
            'TOTAL\nSALARY',
            'ADVANCE',
            'LOAN'
        ];

        // Process rows in chunks to track progress
        const chunkSize = 500;
        const rows = [];

        for (let i = 0; i < reportData.length; i += chunkSize) {
            const chunk = reportData.slice(i, Math.min(i + chunkSize, reportData.length));

            chunk.forEach((item, index) => {
                const row = [
                    String(i + index + 1), // S.no
                    item.name || '-',
                    item.cnic || '-',
                    item.salary !== undefined ? item.salary.toLocaleString() : '-',
                    item.daysMonth || '-',
                    item.p !== undefined ? String(item.p) : '-', // Absent days mapped to P
                    item.totalPayableDays !== undefined ? String(item.totalPayableDays) : '-',
                    item.avgSalary !== undefined ? Math.round(item.avgSalary).toLocaleString() : '-',
                    item.convAlw !== undefined ? Math.round(item.convAlw).toLocaleString() : '-',
                    item.foodAlw !== undefined ? Math.round(item.foodAlw).toLocaleString() : '-',
                    item.eot !== undefined ? String(item.eot) : '-',
                    item.wo !== undefined ? String(item.wo) : '-',
                    item.eotAmount !== undefined ? Math.round(item.eotAmount).toLocaleString() : '-',
                    item.totalSalary !== undefined ? Math.round(item.totalSalary).toLocaleString() : '-',
                    item.lessAdvance !== undefined ? item.lessAdvance.toLocaleString() : '-',
                    item.lessLoan !== undefined ? item.lessLoan.toLocaleString() : '-',
                ];
                rows.push(row);
            });

            // Send progress update
            const progress = Math.min(Math.round((i + chunk.length) / totalRows * 100), 99);
            self.postMessage({ type: 'progress', progress });
        }

        // Add Grand Total row
        if (reportData.length > 0) {
            const firstRow = reportData[0];
            const grandTotalRow = [
                '',
                'GRAND TOTAL',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                firstRow.grandTotalSalry !== undefined ? Math.round(firstRow.grandTotalSalry).toLocaleString() : '-',
                firstRow.grandLessAdvance !== undefined ? Math.round(firstRow.grandLessAdvance).toLocaleString() : '-',
                '' // Loan total not explicitly provided by SP, leaving blank
            ];
            rows.push(grandTotalRow);
        }

        // Generate table
        autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 40,
            theme: 'grid',
            rowPageBreak: 'avoid',
            styles: {
                fontSize: 7,
                minCellHeight: 8,
                cellPadding: 1,
                overflow: 'linebreak',
                font: 'helvetica',
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: [211, 211, 211], // Light grey
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                fontSize: 7,
                minCellHeight: 10,
                halign: 'center',
                valign: 'middle',
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 }, // S.no
                1: { halign: 'left', cellWidth: 28 }, // Name
                2: { halign: 'center', cellWidth: 25 }, // CNIC
                // The rest center aligned
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' },
                6: { halign: 'center' },
                7: { halign: 'center' },
                8: { halign: 'center' },
                9: { halign: 'center' },
                10: { halign: 'center' },
                11: { halign: 'center' },
                12: { halign: 'center' },
                13: { halign: 'center', fontStyle: 'bold' }, // Total Salary
                14: { halign: 'center' },
                15: { halign: 'center' }
            },
            // eslint-disable-next-line func-names
            willDrawCell(data) {
                // Bold the GRAND TOTAL row
                if (data.row.index === rows.length - 1 && reportData.length > 0) {
                    doc.setFont('helvetica', 'bold');
                    data.cell.styles.fillColor = [240, 240, 240];
                }
            },
            tableWidth: 'auto',
            margin: { left: 10, right: 10 },
            didDrawPage(data) {
                const pageNum = doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.text(
                    `Page ${pageNum}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            },
        });

        // Complete
        self.postMessage({ type: 'progress', progress: 100 });

        const pdfBlob = doc.output('blob');

        self.postMessage({
            type: 'complete',
            success: true,
            blob: pdfBlob,
        });
    } catch (error) {
        self.postMessage({
            type: 'complete',
            success: false,
            error: error.message,
        });
    }
};
