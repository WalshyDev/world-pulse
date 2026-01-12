import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserStats } from '@world-pulse/shared';

const STATS_KEY = 'world-pulse-stats';

interface UserStatsContextValue {
  stats: UserStats | null;
  refetch: () => Promise<void>;
}

const UserStatsContext = createContext<UserStatsContextValue | null>(null);

export function UserStatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<UserStats | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/user/stats');
      const data = await res.json();

      if (data.success) {
        setStats(data.data);
        localStorage.setItem(STATS_KEY, JSON.stringify(data.data));
      }
    } catch {
      // Use local stats if server fails
    }
  }, []);

  useEffect(() => {
    // Load stats from localStorage first for immediate display
    const stored = localStorage.getItem(STATS_KEY);
    if (stored) {
      try {
        setStats(JSON.parse(stored));
      } catch {
        // Invalid stored data
      }
    }

    // Fetch from server to sync
    fetchStats();
  }, [fetchStats]);

  return (
    <UserStatsContext.Provider value={{ stats, refetch: fetchStats }}>
      {children}
    </UserStatsContext.Provider>
  );
}

export function useUserStats() {
  const context = useContext(UserStatsContext);
  if (!context) {
    throw new Error('useUserStats must be used within a UserStatsProvider');
  }
  return context;
}
