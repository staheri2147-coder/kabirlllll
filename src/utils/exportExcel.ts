import * as XLSX from 'xlsx';

export interface ExcelExportOptions {
  fileName: string;
  sheetName?: string;
  data: Record<string, any>[];
  headers?: { key: string; label: string }[];
}

export function exportToExcel({
  fileName,
  sheetName = 'گزارش',
  data,
  headers,
}: ExcelExportOptions) {
  try {
    let exportData: any[];

    if (headers && headers.length > 0) {
      exportData = data.map((item) => {
        const row: Record<string, any> = {};
        headers.forEach((h) => {
          row[h.label] = item[h.key] ?? '';
        });
        return row;
      });
    } else {
      exportData = data;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Set RTL property for worksheet
    if (!worksheet['!views']) {
      worksheet['!views'] = [{ RTL: true }];
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
}
