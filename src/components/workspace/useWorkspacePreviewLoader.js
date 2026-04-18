import { useEffect, useState } from 'react';

export default function useWorkspacePreviewLoader({ selectedItem, loadPreview, deps = [] }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!selectedItem) {
        setPreview(null);
        setError('');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const nextPreview = await loadPreview(selectedItem);
        if (!cancelled) {
          setPreview(nextPreview);
        }
      } catch (nextError) {
        if (!cancelled) {
          setPreview(null);
          setError(nextError?.message || String(nextError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [selectedItem, loadPreview, ...deps]);

  return {
    preview,
    loading,
    error,
  };
}
