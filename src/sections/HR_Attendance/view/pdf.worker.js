/* eslint-disable no-restricted-globals */
// pdf.worker.js (Complete version with progress tracking)
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
        doc.text(
            `ATTENDANCE SHEET FOR THE MONTH OF ${formatDate(currentMonth)}`,
            pageWidth / 2,
            35,
            { align: 'center' }
        );

        // Prepare headers
        const headers = [
            'Code',
            'Name',
            ...Array.from({ length: 31 }, (_, i) => String(i + 1)),
            'P',
            'L',
            'A',
            'OT',
            'WO',
            'G',
        ];

        // Process rows in chunks to track progress
        const chunkSize = 500;
        const rows = [];

        for (let i = 0; i < reportData.length; i += chunkSize) {
            const chunk = reportData.slice(i, Math.min(i + chunkSize, reportData.length));

            chunk.forEach((item) => {
                const row = [
                    item.empCode || '-',
                    item.name || '-',
                ];

                for (let j = 1; j <= 31; j += 1) {
                    row.push(item[j] !== undefined ? String(item[j]) : '-');
                }

                row.push(
                    item.totalPresent !== undefined ? String(item.totalPresent) : '-',
                    item.totalLeave !== undefined ? String(item.totalLeave) : '-',
                    item.totalAbsent !== undefined ? String(item.totalAbsent) : '-',
                    item.totalOvertime !== undefined ? String(item.totalOvertime) : '-',
                    item.totalWeekOff !== undefined ? String(item.totalWeekOff) : '-',
                    item.totalGazzetted !== undefined ? String(item.totalGazzetted) : '-'
                );

                rows.push(row);
            });

            // Send progress update
            const progress = Math.min(Math.round((i + chunk.length) / totalRows * 100), 99);
            self.postMessage({ type: 'progress', progress });
        }

        // Calculate column widths
        const colWidths = [8, 22, ...Array(31).fill(3), 4, 4, 4, 4, 4, 4];
        const totalWidth = colWidths.reduce((a, b) => a + b, 0);
        const scaleFactor = (pageWidth - 20) / totalWidth;
        const scaledWidths = colWidths.map(w => w * scaleFactor);

        const customColumnStyles = {};
        scaledWidths.forEach((width, index) => {
            customColumnStyles[index] = {
                cellWidth: width,
                halign: index < 2 ? 'left' : 'center'
            };
        });

        // Generate table
        autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 40,
            theme: 'grid',
            rowPageBreak: 'avoid',
            styles: {
                fontSize: 6.5,
                minCellHeight: 7,
                cellPadding: 1,
                overflow: 'linebreak',
                font: 'helvetica',
                lineColor: [0, 0, 0],
                lineWidth: 0.1,

            },
            headStyles: {
                fillColor: [232, 232, 232],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                fontSize: 6.5,
                minCellHeight: 8,
                halign: 'center',
                valign: 'middle',
            },
            columnStyles: customColumnStyles,
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