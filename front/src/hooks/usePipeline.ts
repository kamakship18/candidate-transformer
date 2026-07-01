import { useCallback, useState } from 'react';
import { usePipelineStore } from '../store/pipeline.store';

/**
 * Hook for running the pipeline with local loading/error state.
 * Delegates to the Zustand store action.
 */
export function usePipeline() {
  const run = usePipelineStore((state) => state.runPipeline);
  const status = usePipelineStore((state) => state.status);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setError(null);
    try {
      await run();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pipeline failed');
    }
  }, [run]);

  return {
    execute,
    isRunning: status === 'running',
    isSuccess: status === 'success',
    error,
  };
}
