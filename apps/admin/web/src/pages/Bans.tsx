import { useEffect, useState } from 'react';

interface BannedIp {
  ip: string;
  reason: string | null;
  bannedAt: string;
  bannedBy: string | null;
}

export function Bans() {
  const [bans, setBans] = useState<BannedIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBan, setNewBan] = useState({ ip: '', reason: '' });

  useEffect(() => {
    fetchBans();
  }, []);

  async function fetchBans() {
    try {
      const res = await fetch('/api/bans');
      const data = await res.json() as { success: boolean; data: BannedIp[] };
      if (data.success) {
        setBans(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch bans:', err);
    } finally {
      setLoading(false);
    }
  }

  async function addBan() {
    if (!newBan.ip.trim()) {
      alert('Please enter an IP address');
      return;
    }

    const res = await fetch('/api/bans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: newBan.ip, reason: newBan.reason || null }),
    });

    if (res.ok) {
      setShowAddModal(false);
      setNewBan({ ip: '', reason: '' });
      fetchBans();
    } else {
      const data = await res.json() as { error?: string };
      alert(data.error || 'Failed to ban IP');
    }
  }

  async function unbanIp(ip: string) {
    if (!confirm(`Unban ${ip}?`)) return;

    const res = await fetch(`/api/bans/${encodeURIComponent(ip)}`, { method: 'DELETE' });
    if (res.ok) {
      fetchBans();
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Banned IPs</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-red-600 px-4 py-2 font-medium hover:bg-red-700"
        >
          + Ban IP
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-700">
          <table className="w-full">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">IP Address</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">Reason</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">Banned At</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">Banned By</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {bans.map((ban) => (
                <tr key={ban.ip} className="bg-slate-800/50">
                  <td className="px-6 py-4 font-mono text-sm">{ban.ip}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{ban.reason || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(ban.bannedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{ban.bannedBy || '-'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => unbanIp(ban.ip)}
                      className="rounded bg-green-600 px-3 py-1 text-sm hover:bg-green-700"
                    >
                      Unban
                    </button>
                  </td>
                </tr>
              ))}
              {bans.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No banned IPs
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Ban Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl bg-slate-800 p-6">
            <h2 className="mb-4 text-xl font-bold">Ban IP Address</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">IP Address</label>
                <input
                  type="text"
                  value={newBan.ip}
                  onChange={(e) => setNewBan({ ...newBan, ip: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 font-mono"
                  placeholder="192.168.1.1"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-400">Reason (optional)</label>
                <input
                  type="text"
                  value={newBan.reason}
                  onChange={(e) => setNewBan({ ...newBan, reason: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2"
                  placeholder="Spam, abuse, etc."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg bg-slate-600 px-4 py-2 hover:bg-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={addBan}
                className="rounded-lg bg-red-600 px-4 py-2 hover:bg-red-700"
              >
                Ban IP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
