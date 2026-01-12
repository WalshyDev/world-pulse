import { useEffect, useState } from 'react';

interface OverviewStats {
  totalQuestions: number;
  activeQuestions: number;
  totalVotes: number;
  uniqueVoters: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  bannedIps: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/stats/overview');
      const data = await res.json() as { success: boolean; data: OverviewStats };
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-slate-400">Loading...</div>;
  }

  if (!stats) {
    return <div className="text-red-400">Failed to load stats</div>;
  }

  const cards = [
    { label: 'Total Questions', value: stats.totalQuestions, icon: '❓', color: 'bg-blue-500/20' },
    { label: 'Active Questions', value: stats.activeQuestions, icon: '🔥', color: 'bg-orange-500/20' },
    { label: 'Total Votes', value: stats.totalVotes.toLocaleString(), icon: '🗳️', color: 'bg-green-500/20' },
    { label: 'Unique Voters', value: stats.uniqueVoters.toLocaleString(), icon: '👥', color: 'bg-purple-500/20' },
    { label: 'Queue Submissions', value: stats.totalSubmissions, icon: '📋', color: 'bg-cyan-500/20' },
    { label: 'Pending Review', value: stats.pendingSubmissions, icon: '⏳', color: 'bg-yellow-500/20' },
    { label: 'Banned IPs', value: stats.bannedIps, icon: '🚫', color: 'bg-red-500/20' },
  ];

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl ${card.color} border border-slate-700 p-6`}
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{card.icon}</span>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm text-slate-400">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
