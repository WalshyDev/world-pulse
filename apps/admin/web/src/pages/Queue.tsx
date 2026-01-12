import { useEffect, useState } from 'react';

interface Submission {
  id: string;
  text: string;
  options: string[];
  submittedAt: string;
  submittedByIp: string;
  upvotes: number;
  status: 'pending' | 'approved' | 'rejected';
}

export function Queue() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  async function fetchSubmissions() {
    try {
      const url = filter ? `/api/queue?status=${filter}` : '/api/queue';
      const res = await fetch(url);
      const data = await res.json() as { success: boolean; data: Submission[] };
      if (data.success) {
        setSubmissions(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function rejectSubmission(id: string) {
    const res = await fetch(`/api/queue/${id}/reject`, { method: 'POST' });
    if (res.ok) {
      fetchSubmissions();
    }
  }

  async function promoteSubmission(id: string) {
    if (!confirm('Promote this submission to the active question? This will archive the current question.')) {
      return;
    }

    const res = await fetch(`/api/queue/${id}/promote`, { method: 'POST' });
    if (res.ok) {
      fetchSubmissions();
    }
  }

  async function deleteSubmission(id: string) {
    if (!confirm('Delete this submission? This cannot be undone.')) return;

    const res = await fetch(`/api/queue/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchSubmissions();
    }
  }

  const statusColors = {
    pending: 'bg-green-500/20 text-green-300',
    approved: 'bg-blue-500/20 text-blue-300',
    rejected: 'bg-red-500/20 text-red-300',
  };

  const statusLabels = {
    pending: 'Eligible',
    approved: 'Used',
    rejected: 'Rejected',
  };

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">Question Queue</h1>
      <p className="mb-6 text-sm text-slate-400">
        The top-voted eligible submission automatically becomes tomorrow's question at midnight UTC.
        Only reject or delete inappropriate content.
      </p>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {[
          { value: 'pending', label: 'Eligible' },
          { value: 'approved', label: 'Used' },
          { value: 'rejected', label: 'Rejected' },
          { value: '', label: 'All' },
        ].map(({ value, label }) => (
          <button
            key={value || 'all'}
            onClick={() => setFilter(value)}
            className={`rounded-lg px-4 py-2 text-sm ${
              filter === value ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          {submissions.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{s.text}</h3>
                  <p className="text-sm text-slate-400">
                    {s.options.join(' / ')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Submitted by {s.submittedByIp} • {new Date(s.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-sm text-slate-300">
                    <span>👍</span> {s.upvotes}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[s.status]}`}>
                    {statusLabels[s.status]}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {s.status === 'pending' && (
                  <>
                    <button
                      onClick={() => promoteSubmission(s.id)}
                      className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-700"
                    >
                      Promote Now
                    </button>
                    <button
                      onClick={() => rejectSubmission(s.id)}
                      className="rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => deleteSubmission(s.id)}
                  className="rounded bg-slate-600 px-3 py-1 text-sm hover:bg-slate-500"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {submissions.length === 0 && (
            <p className="text-slate-400">No submissions found</p>
          )}
        </div>
      )}
    </div>
  );
}
