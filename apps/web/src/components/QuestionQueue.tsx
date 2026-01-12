import { useState } from 'react';
import { useQuestionQueue } from '../hooks/useQuestionQueue';

export function QuestionQueue() {
  const { submissions, hasSubmitted, loading, submitQuestion, upvote } = useQuestionQueue();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="w-full max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Tomorrow's Question</h2>
          <p className="text-sm text-slate-400">
            Vote for the question you want to see next
          </p>
        </div>
        {hasSubmitted ? (
          <span className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-400">
            Already Submitted
          </span>
        ) : (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : 'Submit Question'}
          </button>
        )}
      </div>

      {showForm && !hasSubmitted && (
        <SubmitQuestionForm
          onSubmit={async (text, options) => {
            await submitQuestion(text, options);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div className="py-8 text-center text-slate-400">Loading queue...</div>
      ) : submissions.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center">
          <p className="text-slate-400">No questions in the queue yet.</p>
          <p className="mt-2 text-sm text-slate-500">Be the first to submit one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((submission, index) => (
            <div
              key={submission.id}
              className="rounded-xl border border-slate-700 bg-slate-800/50 p-4"
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => upvote(submission.id)}
                  disabled={submission.userUpvoted}
                  className={`flex flex-col items-center rounded-lg px-3 py-2 transition-colors ${
                    submission.userUpvoted
                      ? 'bg-blue-600/20 text-blue-400 cursor-default'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  <span className="text-sm font-medium">{submission.upvotes}</span>
                </button>

                <div className="flex-1">
                  <p className="font-medium">{submission.text}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {submission.options.map((option, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300"
                      >
                        {option}
                      </span>
                    ))}
                  </div>
                </div>

                {index === 0 && (
                  <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs font-medium text-green-400">
                    Leading
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmitQuestionForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (text: string, options: string[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!text.trim()) {
      setError('Please enter a question');
      return;
    }
    if (!option1.trim() || !option2.trim()) {
      setError('Please enter both options');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(text.trim(), [option1.trim(), option2.trim()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit question');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">
          Your Question
        </label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Will AI surpass humans by 2030?"
          maxLength={100}
          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">{text.length}/100 characters</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">
            Option 1
          </label>
          <input
            type="text"
            value={option1}
            onChange={(e) => setOption1(e.target.value)}
            placeholder="Yes"
            maxLength={30}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">
            Option 2
          </label>
          <input
            type="text"
            value={option2}
            onChange={(e) => setOption2(e.target.value)}
            placeholder="No"
            maxLength={30}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Questions must be neutral and balanced. Both options should represent fair viewpoints.
      </p>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  );
}
