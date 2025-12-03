export interface ExtractionConfig {
    categories: Category[];
    providerId: string;
    modelId: string;
    temperature: number;
  }
  
export interface Category {
  id: string;
  name: string;
  prompt: string;
  expectedValues?: string[];
}

export interface UploadedFile {
  name: string;
  size: number;
  type: 'csv' | 'pdf' | 'pdf-folder';
  preview?: FilePreview;
  nativeFile?: File;      // For single file uploads
  nativeFiles?: File[];   // For folder uploads (array of PDFs)
}

export interface FilePreview {
  columns?: string[];
  sampleRows?: Record<string, unknown>[];
  pageCount?: number;
  pdfCount?: number;      // Number of PDFs in folder
}

export interface CSVFilePreview extends FilePreview {
  columns: string[];
  sampleRows: Record<string, unknown>[];
}

export interface PDFFilePreview extends FilePreview {
  pageCount: number;
}

export interface UploadedFileWithColumns extends UploadedFile {
  idColumn?: string;
  textColumn?: string;
  allColumns?: string[];
}