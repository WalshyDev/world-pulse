import { useState, useEffect, useCallback } from 'react';
import type { GlobalVotes, Achievement } from '@world-pulse/shared';

export function useVotes(questionId: string | undefined) {
  const [votes, setVotes] = useState<GlobalVotes | null>(null);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  // Check if user has already voted
  const checkUserVote = useCallback(async () => {
    if (!questionId) return;

    try {
      const res = await fetch(`/api/votes/${questionId}/check`);
      const data = await res.json();

      if (data.success && data.data.voted) {
        setUserVote(data.data.optionId);
      }
    } catch (err) {
      console.error('Failed to check vote status:', err);
    }
  }, [questionId]);

  // Check vote status on mount and when questionId changes
  useEffect(() => {
    if (!questionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    checkUserVote().finally(() => setLoading(false));
  }, [questionId, checkUserVote]);

  // Fetch current vote counts
  useEffect(() => {
    if (!questionId) return;

    fetchVotes();

    // Set up WebSocket for real-time updates
    const ws = setupWebSocket(questionId, (update) => {
      setVotes(update);
    });

    return () => {
      ws?.close();
    };
  }, [questionId]);

  async function fetchVotes() {
    if (!questionId) return;

    try {
      const res = await fetch(`/api/votes/${questionId}`);
      const data = await res.json();

      if (data.success) {
        setVotes(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch votes:', err);
    }
  }

  const submitVote = useCallback(
    async (optionId: string) => {
      if (!questionId || userVote) return;

      try {
        const res = await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId, optionId }),
        });

        const data = await res.json();

        if (data.success) {
          setUserVote(optionId);
          // Handle new response structure with votes and newAchievements
          if (data.data.votes) {
            setVotes(data.data.votes);
          } else {
            setVotes(data.data);
          }
          // Set new achievements if any were granted
          if (data.data.newAchievements && data.data.newAchievements.length > 0) {
            setNewAchievements(data.data.newAchievements);
          }
        } else {
          // If already voted (409), fetch current vote status
          if (res.status === 409) {
            await checkUserVote();
          }
          console.error('Vote failed:', data.error);
        }
      } catch (err) {
        console.error('Failed to submit vote:', err);
      }
    },
    [questionId, userVote, checkUserVote],
  );

  const clearAchievements = useCallback(() => {
    setNewAchievements([]);
  }, []);

  return { votes, userVote, submitVote, loading, refetch: fetchVotes, newAchievements, clearAchievements };
}

function setupWebSocket(
  questionId: string,
  onUpdate: (votes: GlobalVotes) => void,
): WebSocket | null {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws?questionId=${questionId}`);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'vote_update') {
          onUpdate(message.payload);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    return ws;
  } catch (err) {
    console.error('Failed to setup WebSocket:', err);
    return null;
  }
}
