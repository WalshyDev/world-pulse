import { useState } from 'react';
import { useUserStats } from '../contexts/UserStatsContext';
import { AchievementsModal } from './AchievementsModal';
import { ACHIEVEMENT_DEFS } from '@world-pulse/shared';

export function StatsBar() {
  const { stats } = useUserStats();
  const [showAchievements, setShowAchievements] = useState(false);

  if (!stats) {
    return null;
  }

  const unlockedCount = stats.achievements.length;
  const totalCount = ACHIEVEMENT_DEFS.length;

  return (
    <>
      <div className="flex items-center gap-3 text-sm">
        {stats.streak > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5">
            <span className="text-orange-400">🔥</span>
            <span className="font-medium">{stats.streak} day streak</span>
          </div>
        )}

        <button
          onClick={() => setShowAchievements(true)}
          className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 transition-colors hover:bg-slate-700"
        >
          <span>🏆</span>
          <span className="font-medium">
            {unlockedCount}/{totalCount} achievements
          </span>
        </button>
      </div>

      <AchievementsModal
        isOpen={showAchievements}
        onClose={() => setShowAchievements(false)}
        unlockedAchievements={stats.achievements}
      />
    </>
  );
}
