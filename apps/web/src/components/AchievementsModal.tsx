import { useEffect, useRef } from 'react';
import type { Achievement } from '@world-pulse/shared';
import { ACHIEVEMENT_DEFS } from '@world-pulse/shared';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedAchievements: Achievement[];
}

export function AchievementsModal({ isOpen, onClose, unlockedAchievements }: AchievementsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Create a set of unlocked achievement names for quick lookup
  const unlockedNames = new Set(unlockedAchievements.map((a) => a.name));

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const unlockedCount = unlockedAchievements.length;
  const totalCount = ACHIEVEMENT_DEFS.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="mx-4 max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl bg-slate-800 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-white">Achievements</h2>
            <p className="text-sm text-slate-400">
              {unlockedCount} of {totalCount} unlocked
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-3">
          <div className="h-2 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Achievement list */}
        <div className="max-h-[50vh] overflow-y-auto px-6 pb-6">
          <div className="space-y-3">
            {ACHIEVEMENT_DEFS.map((def) => {
              const isUnlocked = unlockedNames.has(def.name);
              const unlockedAchievement = unlockedAchievements.find((a) => a.name === def.name);

              return (
                <div
                  key={def.id}
                  className={`flex items-center gap-4 rounded-xl p-4 transition-all ${
                    isUnlocked
                      ? 'bg-slate-700/50'
                      : 'bg-slate-800/50 opacity-50'
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                      isUnlocked
                        ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20'
                        : 'bg-slate-700/50 grayscale'
                    }`}
                  >
                    {def.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                        {def.name}
                      </h3>
                      {isUnlocked && (
                        <svg className="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">{def.description}</p>
                    {isUnlocked && unlockedAchievement && (
                      <p className="mt-1 text-xs text-slate-500">
                        Unlocked {formatDate(unlockedAchievement.unlockedAt)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
