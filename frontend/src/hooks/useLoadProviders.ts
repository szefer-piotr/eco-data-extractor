import { useEffect } from 'react';
import { useConfigStore } from '@store/configStore';
import { configApi } from '@services/configApi';

/** Load LLM provider options once so Settings, Extraction, and Projects share them. */
export const useLoadProviders = () => {
  const models = useConfigStore((s) => s.models);
  const setModels = useConfigStore((s) => s.setModels);
  const setLoading = useConfigStore((s) => s.setLoading);
  const setError = useConfigStore((s) => s.setError);

  useEffect(() => {
    if (models) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const response = await configApi.getModels();
        if (!cancelled) {
          setModels(response);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load providers';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [models, setModels, setLoading, setError]);
};

export default useLoadProviders;
