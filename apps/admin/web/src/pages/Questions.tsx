import { useEffect, useState } from 'react';

interface Question {
  id: string;
  text: string;
  options: Array<{ id: string; text: string; color: string }>;
  status: 'pending' | 'active' | 'archived';
  createdAt: string;
  activeFrom: string | null;
  activeTo: string | null;
}

export function Questions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '', options: ['', ''] });

  useEffect(() => {
    fetchQuestions();
  }, [filter]);

  async function fetchQuestions() {
    try {
      const url = filter ? `/api/questions?status=${filter}` : '/api/questions';
      const res = await fetch(url);
      const data = await res.json() as { success: boolean; data: Question[] };
      if (data.success) {
        setQuestions(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function activateQuestion(id: string) {
    if (!confirm('Activate this question? This will archive the current active question.')) return;

    const res = await fetch(`/api/questions/${id}/activate`, { method: 'POST' });
    if (res.ok) {
      fetchQuestions();
    }
  }

  async function archiveQuestion(id: string) {
    if (!confirm('Archive this question?')) return;

    const res = await fetch(`/api/questions/${id}/archive`, { method: 'POST' });
    if (res.ok) {
      fetchQuestions();
    }
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question? This cannot be undone.')) return;

    const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchQuestions();
    }
  }

  async function createQuestion() {
    const validOptions = newQuestion.options.filter((o) => o.trim());
    if (!newQuestion.text.trim() || validOptions.length < 2) {
      alert('Please provide a question and at least 2 options');
      return;
    }

    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newQuestion.text, options: validOptions }),
    });

    if (res.ok) {
      setShowCreateModal(false);
      setNewQuestion({ text: '', options: ['', ''] });
      fetchQuestions();
    }
  }

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-300',
    active: 'bg-green-500/20 text-green-300',
    archived: 'bg-slate-500/20 text-slate-400',
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Questions</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700"
        >
          + Create Question
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {['', 'pending', 'active', 'archived'].map((status) => (
          <button
            key={status || 'all'}
            onClick={() => setFilter(status)}
            className={`rounded-lg px-4 py-2 text-sm ${
              filter === status ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{q.text}</h3>
                  <p className="text-sm text-slate-400">
                    {q.options.map((o) => o.text).join(' / ')}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[q.status]}`}>
                  {q.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {q.status === 'pending' && (
                  <>
                    <button
                      onClick={() => activateQuestion(q.id)}
                      className="rounded bg-green-600 px-3 py-1 text-sm hover:bg-green-700"
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </>
                )}
                {q.status === 'active' && (
                  <button
                    onClick={() => archiveQuestion(q.id)}
                    className="rounded bg-slate-600 px-3 py-1 text-sm hover:bg-slate-500"
                  >
                    Archive
                  </button>
                )}
                <span className="text-xs text-slate-500">ID: {q.id}</span>
              </div>
            </div>
          ))}

          {questions.length === 0 && (
            <p className="text-slate-400">No questions found</p>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl bg-slate-800 p-6">
            <h2 className="mb-4 text-xl font-bold">Create Question</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Question</label>
                <input
                  type="text"
                  value={newQuestion.text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2"
                  placeholder="Enter your question..."
                />
              </div>

              {newQuestion.options.map((opt, i) => (
                <div key={i}>
                  <label className="mb-1 block text-sm text-slate-400">Option {i + 1}</label>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const opts = [...newQuestion.options];
                      opts[i] = e.target.value;
                      setNewQuestion({ ...newQuestion, options: opts });
                    }}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2"
                    placeholder={`Option ${i + 1}...`}
                  />
                </div>
              ))}

              {newQuestion.options.length < 4 && (
                <button
                  onClick={() => setNewQuestion({
                    ...newQuestion,
                    options: [...newQuestion.options, ''],
                  })}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  + Add option
                </button>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg bg-slate-600 px-4 py-2 hover:bg-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={createQuestion}
                className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
