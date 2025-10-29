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
  type: 'csv' | 'pdf';
  preview?: FilePreview;
}

export interface FilePreview {
  columns?: string[];
  sampleRows?: Record<string, unknown>[];
  pageCount?: number;
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