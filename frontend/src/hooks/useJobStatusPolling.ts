// frontend/src/hooks/useJobStatusPolling.ts
import { useEffect, useRef, useState } from 'react';
import { extractionApi } from '@services/extractionApi';
import { JobStatus } from '@api-types/api';

interface UseJobStatusPollingOptions {
  jobId: string | null;
  pollInterval?: number;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export const useJobStatusPolling = ({
  jobId,
  pollInterval = 2000,
  onComplete,
  onError,
}: UseJobStatusPollingOptions) => {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!jobId) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    const poll = async () => {
      try {
        const status = await extractionApi.getStatus(jobId);
        setJobStatus(status);
        setError(null);

        if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
          setIsPolling(false);
          onComplete?.();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Polling error';
        setError(message);
        onError?.(message);
        setIsPolling(false);
      }
    };

    poll(); // Initial poll
    intervalRef.current = setInterval(poll, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId, pollInterval, onComplete, onError]);

  return { jobStatus, isPolling, error };
};