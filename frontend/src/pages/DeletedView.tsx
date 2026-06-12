import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useDeletedProducts, useProductMutations } from '../api/hooks';
import { useFlash } from '../App';
import { Btn, Code, Spinner, ErrorNote } from '../components/ui';

function relTime(iso?: string | null): string {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return Math.floor(d / 60) + ' min ago';
  if (d < 86400) return Math.floor(d / 3600) + ' hr ago';
  if (d < 604800) return Math.floor(d / 86400) + ' days ago';
  return new Date(iso).toLocaleDateString();
}

export default function DeletedView() {
  const flash = useFlash();
  const delQ = useDeletedProducts(true);
  const { restore } = useProductMutations();

  if (delQ.isLoading) return <Spinner />;
  if (delQ.error) return <ErrorNote error={delQ.error} />;
  const items = delQ.data || [];

  return (
    <div>
      <p className="text-sm text-zinc-400 mb-4">Deleted products are kept here and can be restored at any time — there is no automatic purge, so nothing is lost. Restoring brings a product back exactly as it was, and is recorded in the Audit Trail.</p>

      {items.length === 0 ? (
        <div className="text-center text-zinc-500 text-sm py-16 border border-zinc-800 rounded-xl bg-zinc-900">
          Nothing deleted. Products you delete will appear here.
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/40 text-zinc-500 text-[11px] uppercase tracking-wider">
              <tr className="text-left">
                <th className="px-4 py-2.5 font-semibold">Product code</th>
                <th className="px-4 py-2.5 font-semibold">Name</th>
                <th className="px-4 py-2.5 font-semibold">Set</th>
                <th className="px-4 py-2.5 font-semibold">Deleted</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-zinc-800 hover:bg-zinc-800/60">
                  <td className="px-4 py-2.5 font-mono text-xs"><Code>{p.summary.code || '—'}</Code></td>
                  <td className="px-4 py-2.5 text-zinc-200">{p.summary.name || '(no name)'}</td>
                  <td className="px-4 py-2.5 text-zinc-400">{p.setName}</td>
                  <td className="px-4 py-2.5 text-zinc-400 text-xs whitespace-nowrap" title={p.deletedAt ? new Date(p.deletedAt).toLocaleString() : ''}>{relTime(p.deletedAt)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Btn size="sm" variant="outline" disabled={restore.isPending}
                      onClick={() => restore.mutate(p.id, { onSuccess: () => flash('Product restored') })}>
                      <RotateCcw size={13} />Restore
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-zinc-600 mt-3">{items.length} deleted {items.length === 1 ? 'product' : 'products'}.</p>
    </div>
  );
}
