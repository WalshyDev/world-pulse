import { useState, useEffect } from 'react';
import type { Question } from '@world-pulse/shared';

export function useQuestion() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestion();
  }, []);

  async function fetchQuestion() {
    try {
      setLoading(true);
      const res = await fetch('/api/question/current');
      const data = await res.json();

      if (data.success) {
        setQuestion(data.data);
      } else {
        setError(data.error || 'Failed to load question');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }

  return { question, loading, error, refetch: fetchQuestion };
}
