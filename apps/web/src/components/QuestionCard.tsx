import { useState, useEffect } from 'react';
import type { Question } from '@world-pulse/shared';

interface QuestionCardProps {
  question: Question;
}

export function QuestionCard({ question }: QuestionCardProps) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6 backdrop-blur-sm">
      <div className="mb-2 text-sm font-medium uppercase tracking-wider text-blue-400">
        Today's Question
      </div>
      <h2 className="text-2xl font-bold leading-tight md:text-3xl">
        {question.text}
      </h2>
      {question.activeTo && <TimeRemaining activeTo={question.activeTo} />}
    </div>
  );
}

function TimeRemaining({ activeTo }: { activeTo: string }) {
  const [remaining, setRemaining] = useState(() => calculateRemaining(activeTo));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(calculateRemaining(activeTo));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTo]);

  if (remaining.total <= 0) {
    return (
      <p className="mt-3 text-sm text-slate-400">
        Voting has ended
      </p>
    );
  }

  return (
    <p className="mt-3 flex items-center gap-2 text-sm text-slate-400">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
      <span>
        {remaining.hours}h {remaining.minutes}m {remaining.seconds}s remaining
      </span>
    </p>
  );
}

function calculateRemaining(activeTo: string) {
  const endTime = new Date(activeTo).getTime();
  const now = Date.now();
  const total = Math.max(0, endTime - now);

  return {
    total,
    hours: Math.floor(total / (1000 * 60 * 60)),
    minutes: Math.floor((total % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((total % (1000 * 60)) / 1000),
  };
}
