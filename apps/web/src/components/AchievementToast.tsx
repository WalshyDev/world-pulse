import { useEffect, useState } from 'react';
import type { Achievement } from '@world-pulse/shared';

interface AchievementToastProps {
  achievements: Achievement[];
  onClose: () => void;
}

export function AchievementToast({ achievements, onClose }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (achievements.length > 0) {
      setVisible(true);
      setCurrentIndex(0);
    }
  }, [achievements]);

  useEffect(() => {
    if (!visible || achievements.length === 0) return;

    // Auto-advance through achievements
    const timer = setTimeout(() => {
      if (currentIndex < achievements.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        // Close after showing all
        setTimeout(() => {
          setVisible(false);
          onClose();
        }, 3000);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [visible, currentIndex, achievements.length, onClose]);

  if (!visible || achievements.length === 0) return null;

  const achievement = achievements[currentIndex];

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        className="animate-slide-down flex items-center gap-4 rounded-xl border border-yellow-500/30 bg-slate-800/95 p-4 shadow-xl backdrop-blur-sm"
        onClick={() => {
          setVisible(false);
          onClose();
        }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20">
          <svg
            className="h-6 w-6 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        </div>

        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-yellow-400">
            Achievement Unlocked!
          </p>
          <p className="text-lg font-bold text-white">{achievement.name}</p>
          <p className="text-sm text-slate-400">{achievement.description}</p>
        </div>

        {achievements.length > 1 && (
          <div className="text-xs text-slate-500">
            {currentIndex + 1} / {achievements.length}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
