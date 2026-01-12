import { useState, useEffect, useCallback } from 'react';

interface QueueSubmission {
  id: string;
  text: string;
  options: string[];
  submittedAt: string;
  upvotes: number;
  status: 'pending' | 'approved' | 'rejected';
  userUpvoted: boolean;
}

export function useQuestionQueue() {
  const [submissions, setSubmissions] = useState<QueueSubmission[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch queue
  useEffect(() => {
    fetchQueue();
  }, []);

  async function fetchQueue() {
    try {
      setLoading(true);
      const res = await fetch('/api/queue');
      const data = await res.json();

      if (data.success) {
        setSubmissions(data.data.submissions);
        setHasSubmitted(data.data.hasSubmitted);
      }
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    } finally {
      setLoading(false);
    }
  }

  const submitQuestion = useCallback(async (text: string, options: string[]) => {
    const res = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, options }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to submit');
    }

    // Refresh queue
    await fetchQueue();
  }, []);

  const upvote = useCallback(async (submissionId: string) => {
    // Check if already upvoted
    const submission = submissions.find(s => s.id === submissionId);
    if (submission?.userUpvoted) return;

    try {
      const res = await fetch(`/api/queue/${submissionId}/upvote`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        // Update local state
        setSubmissions((prev) =>
          prev
            .map((s) =>
              s.id === submissionId
                ? { ...s, upvotes: s.upvotes + 1, userUpvoted: true }
                : s,
            )
            .sort((a, b) => b.upvotes - a.upvotes),
        );
      }
    } catch (err) {
      console.error('Failed to upvote:', err);
    }
  }, [submissions]);

  return {
    submissions,
    hasSubmitted,
    loading,
    submitQuestion,
    upvote,
    refetch: fetchQueue,
  };
}
