import { useEffect, useState } from 'react';

const DEFAULT_DELAY = 600;

const usePageLoading = (delay: number = DEFAULT_DELAY) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  return loading;
};

export default usePageLoading;

