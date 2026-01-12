import { useState } from 'react';
import type { QuestionOption } from '@world-pulse/shared';

interface VoteButtonsProps {
  options: QuestionOption[];
  onVote: (optionId: string) => Promise<void>;
}

export function VoteButtons({ options, onVote }: VoteButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleVote = async (optionId: string) => {
    if (loading) return;
    setLoading(true);
    try {
      await onVote(optionId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => handleVote(option.id)}
          onMouseEnter={() => setHoveredId(option.id)}
          onMouseLeave={() => setHoveredId(null)}
          disabled={loading}
          className="group relative w-full overflow-hidden rounded-xl border-2 border-slate-600 bg-slate-800/80 p-5 text-left text-lg font-semibold backdrop-blur-sm transition-all hover:border-slate-400 hover:scale-[1.02] disabled:opacity-50"
          style={{
            borderColor: hoveredId === option.id ? option.color : undefined,
          }}
        >
          <span className="relative z-10">{option.text}</span>

          {/* Hover glow effect */}
          <div
            className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-20"
            style={{ backgroundColor: option.color }}
          />
        </button>
      ))}

      <p className="text-center text-sm text-slate-500">
        Your vote is anonymous
      </p>
    </div>
  );
}
