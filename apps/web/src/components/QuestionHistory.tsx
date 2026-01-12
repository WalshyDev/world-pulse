import { useState, useEffect } from 'react';
import type { Question, GlobalVotes } from '@world-pulse/shared';

interface QuestionWithVotes extends Question {
  votes: GlobalVotes;
}

export function QuestionHistory() {
  const [questions, setQuestions] = useState<QuestionWithVotes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const res = await fetch('/api/question/history');
      const data = await res.json() as { success: boolean; data: QuestionWithVotes[] };
      if (data.success) {
        setQuestions(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-lg text-center text-slate-400">
        Loading past questions...
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="w-full max-w-lg text-center text-slate-400">
        <p className="text-lg">No past questions yet.</p>
        <p className="mt-2 text-sm">Check back after a question ends!</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      <h2 className="text-center text-xl font-semibold text-slate-300">Past Questions</h2>

      {questions.map((q) => (
        <QuestionResultCard key={q.id} question={q} />
      ))}
    </div>
  );
}

function QuestionResultCard({ question }: { question: QuestionWithVotes }) {
  const total = question.votes.totalVotes;
  const date = question.activeTo
    ? new Date(question.activeTo).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4 backdrop-blur-xs">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-medium">{question.text}</h3>
        <span className="shrink-0 text-xs text-slate-500">{date}</span>
      </div>

      <div className="space-y-2">
        {question.options.map((option) => {
          const count = question.votes.options.find((o) => o.optionId === option.id)?.count || 0;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div
              key={option.id}
              className="relative overflow-hidden rounded-lg border border-slate-600 p-2"
            >
              {/* Progress bar */}
              <div
                className="absolute inset-y-0 left-0 opacity-25"
                style={{
                  backgroundColor: option.color,
                  width: `${percentage}%`,
                }}
              />

              {/* Content */}
              <div className="relative flex items-center justify-between text-sm">
                <span>{option.text}</span>
                <span className="font-semibold">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-center text-xs text-slate-500">
        {total.toLocaleString()} votes
      </p>
    </div>
  );
}
