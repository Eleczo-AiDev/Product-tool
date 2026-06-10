import React, { useState } from 'react';
import { useAuditFeed } from '../api/hooks';
import { Badge, Spinner, ErrorNote, Code } from '../components/ui';

const TONE: Record<string, string> = {
  created: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  updated: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  published: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  reverted: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  restored: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  deleted: 'bg-red-500/10 text-red-300 border-red-500/30',
};
const FILTERS = ['all', 'created', 'updated', 'published', 'reverted', 'restored', 'deleted'];

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AuditView() {
  const feedQ = useAuditFeed();
  const [filter, setFilter] = useState('all');

  if (feedQ.isLoading) return <Spinner />;
  if (feedQ.error) return <ErrorNote error={feedQ.error} />;

  const all = feedQ.data || [];
  const rows = filter === 'all' ? all : all.filter((r) => r.action === filter);

  return (
    <div>
      <p className="text-sm text-zinc-500 mb-4">Every change across all products — who did what, and when. The acting user is recorded automatically once the tool is embedded in the main app.</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs capitalize border transition-colors ${
              filter === f ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'bg-transparent text-zinc-400 border-zinc-700 hover:bg-zinc-800'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-zinc-500 text-sm py-16 border border-zinc-800 rounded-xl bg-zinc-900">
          No activity yet. Changes to products will appear here.
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900">
          <div className="divide-y divide-zinc-800">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors">
                <Badge className={TONE[r.action] || 'bg-zinc-800 text-zinc-300 border-zinc-700'}>{r.action}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Code>{r.summary?.code || '—'}</Code>
                    <span className="text-zinc-200 truncate">{r.summary?.name || '(no name)'}</span>
                    <span className="text-zinc-600 text-xs shrink-0">v{r.version}</span>
                  </div>
                  {r.note && <div className="text-xs text-zinc-500 mt-0.5">{r.note}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-zinc-300">{r.actor}</div>
                  <div className="text-[11px] text-zinc-600" title={new Date(r.at).toLocaleString()}>{timeAgo(r.at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-zinc-600 mt-3">Showing the {all.length} most recent events. To restore a product to an earlier state, open it on the Products screen and use History.</p>
    </div>
  );
}
