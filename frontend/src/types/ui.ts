export interface UIState {
    isLoading: boolean;
    error: string | null;
    success: string | null;
    activeStep: number;
  }
  
  export interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  }