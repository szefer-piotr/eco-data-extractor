// frontend/src/services/fileApi.ts
import Papa from 'papaparse';

export interface CSVParseResult {
  columns: string[];
  sampleRows: Record<string, unknown>[];
}

export interface PDFParseResult {
  pageCount: number;
}

export const fileApi = {
  parseCSV: async (file: File): Promise<CSVParseResult> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        preview: 5, // Only read first 5 rows for preview
        complete: (results) => {
          const columns = results.meta.fields || [];
          const sampleRows = results.data as Record<string, unknown>[];
          resolve({ columns, sampleRows });
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
      });
    });
  },

  parsePDF: async (file: File): Promise<PDFParseResult> => {
    // For now, return a basic result. In production, use pdfjs or similar
    // This is a placeholder since PDF parsing requires additional libraries
    return {
      pageCount: 0, // Would be parsed with pdfjs if installed
    };
  },

  validateFileSize: (file: File, maxSizeMB: number = 100): boolean => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
  },

  getFileType: (file: File): 'csv' | 'pdf' | null => {
    const type = file.type.toLowerCase();
    if (type === 'text/csv' || file.name.endsWith('.csv')) return 'csv';
    if (type === 'application/pdf' || file.name.endsWith('.pdf')) return 'pdf';
    return null;
  },
};