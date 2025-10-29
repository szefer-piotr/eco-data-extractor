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

export interface ProviderInfo {
  name: string;
  models: string[];
  requires_api_key: boolean;
  default_model: string;
}

export interface ProvidersConfig {
  [key: string]: ProviderInfo;
}

// Fixed ModelConfig interface to avoid duplicate/conflicting definitions and match naming convention
export interface ModelConfig {
  providers: ProvidersConfig;
  defaultProvider: string;
  defaultModel: string;
  temperatureRange?: {
    min: number;
    max: number;
  };
}

export interface ModelParameters {
  temperature: number;
  max_tokens?: number;
  top_p?: number;
}

export interface SelectedModelConfig {
  provider: string;
  model: string;
  apiKey?: string;
  parameters: ModelParameters;
}