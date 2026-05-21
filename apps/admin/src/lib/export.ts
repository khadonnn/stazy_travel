'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

/**
 * Export a DOM element as PDF (for chart-heavy pages)
 */
export async function exportToPDF(elementOrId: string | HTMLElement, filename: string = 'report', title?: string) {
    const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!element) {
        throw new Error(typeof elementOrId === 'string' ? `Element #${elementOrId} not found` : 'Element not found');
    }

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--background') || '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [canvas.width + 40, canvas.height + 80],
        });

        if (title) {
            pdf.setFontSize(18);
            pdf.text(title, 20, 30);
            pdf.setFontSize(10);
            pdf.text(`Xuất ngày: ${new Date().toLocaleString('vi-VN')}`, 20, 50);
        }

        const yOffset = title ? 60 : 20;
        pdf.addImage(imgData, 'PNG', 20, yOffset, canvas.width, canvas.height);

        pdf.save(`${filename}_${formatDateForFile()}.pdf`);
    } catch (error) {
        console.error('PDF export failed:', error);
        throw error;
    }
}

/**
 * Export tabular data as Excel (for table pages like /users, /hotels, /bookings)
 */
export function exportToExcel(
    data: Record<string, unknown>[],
    filename: string = 'report',
    sheetName: string = 'Sheet1',
    columnLabels?: Record<string, string>,
) {
    if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
    }

    // Apply column labels if provided
    const formattedData = data.map((row) => {
        if (!columnLabels) return row;
        const newRow: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
            const label = columnLabels[key] || key;
            newRow[label] = value;
        }
        return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Auto-fit column widths
    const colWidths = Object.keys(formattedData[0] || {}).map((key) => {
        const maxLen = Math.max(key.length, ...formattedData.map((row) => String(row[key] || '').length));
        return { wch: Math.min(maxLen + 2, 50) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    XLSX.writeFile(workbook, `${filename}_${formatDateForFile()}.xlsx`);
}

/**
 * Fetch data from API and export as Excel
 */
export async function fetchAndExportExcel(
    apiUrl: string,
    filename: string,
    sheetName: string,
    columnLabels?: Record<string, string>,
    dataExtractor?: (json: unknown) => Record<string, unknown>[],
) {
    try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = await res.json();

        const data = dataExtractor
            ? dataExtractor(json)
            : Array.isArray(json)
              ? json
              : json.data || json.hotels || json.users || json.bookings || [];

        exportToExcel(data, filename, sheetName, columnLabels);
    } catch (error) {
        console.error('Export failed:', error);
        throw error;
    }
}

function formatDateForFile(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}
