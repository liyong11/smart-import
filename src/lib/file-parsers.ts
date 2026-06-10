// File parsers - extract raw content from different file formats
import * as XLSX from 'xlsx';
import { SheetData, CellValue } from './rule-engine';

export function parseExcelToSheets(buffer: Buffer): SheetData[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets: SheetData[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, {
      header: 1,
      defval: null,
      blankrows: true,
    });
    
    const rows: CellValue[][] = jsonData.map((row: any) =>
      Array.isArray(row) ? row.map((cell: any) => cell === undefined ? null : cell) : []
    );

    sheets.push({ name: sheetName, rows });
  }

  return sheets;
}

export async function parsePdfToSheets(buffer: Buffer): Promise<SheetData[]> {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);
  
  // Split text into lines and create a single "sheet"
  const lines: string[] = data.text.split('\n');
  const rows: CellValue[][] = lines.map((line: string) => [line]);

  return [{ name: 'PDF Content', rows }];
}

export async function parseWordToSheets(buffer: Buffer): Promise<SheetData[]> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  
  const lines: string[] = result.value.split('\n');
  const rows: CellValue[][] = lines.map((line: string) => [line]);

  return [{ name: 'Word Content', rows }];
}

export function getFilePreview(sheets: SheetData[], maxRows: number = 30): string {
  let preview = '';
  for (const sheet of sheets) {
    preview += `=== Sheet: ${sheet.name} ===\n`;
    const rows = sheet.rows.slice(0, maxRows);
    for (let i = 0; i < rows.length; i++) {
      const rowStr = rows[i]
        .map((cell: CellValue) => cell === null ? '' : String(cell))
        .filter((s: string) => s)
        .join(' | ');
      if (rowStr.trim()) {
        preview += `Row ${i}: ${rowStr}\n`;
      }
    }
    preview += '\n';
  }
  return preview;
}
