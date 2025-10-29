// Common API types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  }
  
  export interface JobStatus {
    job_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    rows_processed: number;
    total_rows: number;
    error?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface ExtractionResult {
    job_id: string;
    data: Record<string, unknown>[];
    errors?: Array<{
      row_id: number;
      error: string;
    }>;
    metadata?: {
      total_rows: number;
      processed_rows: number;
      failed_rows: number;
    };
  }
  
  export interface ModelConfig {
    providers: string[];
    models: Record<string, string[]>;
    defaultProvider: string;
    defaultModel: string;
  }