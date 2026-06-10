import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { useMasters, useMasterMutations } from '../api/hooks';
import type { Master, MasterValue } from '../api/client';
import { Btn, Spinner, ErrorNote } from '../components/ui';
import { SYSTEMS } from '../lib/resolution';
import { useFlash } from '../App';

const uid = () => 'tmp_' + Math.random().toString(36).slice(2, 9);

export default function MastersView() {
  const flash = useFlash();
  const mastersQ = useMasters();
  const { create, update } = useMasterMutations();
  const [openM, setOpenM] = useState<string | null>(null);
  const [draft, setDraft] = useState<MasterValue[]>([]);
  const [dirty, setDirty] = useState(false);

  const masters = mastersQ.data;
  const master: Master | undefined = masters?.find((m) => m.id === openM) || masters?.[0];

  useEffect(() => {
    if (masters && masters.length && !openM) setOpenM(masters[0].id);
  }, [masters, openM]);

  useEffect(() => {
    if (master) {
      setDraft(JSON.parse(JSON.stringify(master.values)));
      setDirty(false);
    }
  }, [master?.id, mastersQ.dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (mastersQ.isLoading) return <Spinner />;
  if (mastersQ.error) return <ErrorNote error={mastersQ.error} />;
  if (!masters) return null;

  const setCell = (vid: string, key: string, value: string) => {
    setDraft((rows) => rows.map((v) => (v.id === vid ? { ...v, [key]: value } : v)));
    setDirty(true);
  };
  const addValue = () => {
    setDraft((rows) => [...rows, { id: uid(), label: 'New value', hiva: '', magento: '', crm: '', sortOrder: rows.length }]);
    setDirty(true);
  };
  const delValue = (vid: string) => {
    setDraft((rows) => rows.filter((v) => v.id !== vid));
    setDirty(true);
  };
  const saveChanges = () => {
    if (!master) return;
    // strip temp ids so the server assigns real ones
    const values = draft.map((v, i) => ({
      id: v.id.startsWith('tmp_') ? undefined : v.id,
      label: v.label, hiva: v.hiva, magento: v.magento, crm: v.crm, sortOrder: i,
    }));
    update.mutate({ id: master.id, dto: { values } }, {
      onSuccess: () => { setDirty(false); flash('Master saved'); },
      onError: (e) => alert(e instanceof Error ? e.message : 'Save failed'),
    });
  };
  const newMaster = () => {
    const name = prompt('New master name (e.g. "Enclosure Type")', '');
    if (!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    create.mutate({ name, key, values: [] }, {
      onSuccess: (m) => { setOpenM(m.id); flash('Master created'); },
      onError: (e) => alert(e instanceof Error ? e.message : 'Failed'),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-zinc-400">Controlled value lists. Each value carries its HIVA / Magento / CRM equivalent, used when publishing.</p>
        </div>
        <Btn onClick={newMaster}><Plus size={15} />New master</Btn>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {masters.map((m) => (
          <button key={m.id} onClick={() => setOpenM(m.id)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${openM === m.id ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800/60'}`}>
            {m.name}
          </button>
        ))}
      </div>

      {master && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/40 text-zinc-400 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Value (canonical)</th>
                {SYSTEMS.map((s) => <th key={s.id} className="px-4 py-2 font-medium">{s.label} equivalent</th>)}
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {draft.map((v) => (
                <tr key={v.id} className="border-t border-zinc-800">
                  <td className="px-3 py-1.5">
                    <input className="w-full rounded-lg bg-transparent text-zinc-100 placeholder-zinc-600 border border-transparent hover:border-zinc-700 focus:border-zinc-500 focus:bg-zinc-950 outline-none px-2 py-1 font-medium" value={v.label} onChange={(e) => setCell(v.id, 'label', e.target.value)} />
                  </td>
                  {SYSTEMS.map((s) => (
                    <td key={s.id} className="px-3 py-1.5">
                      <input className="w-full rounded-lg bg-transparent text-zinc-300 placeholder-zinc-600 border border-transparent hover:border-zinc-700 focus:border-zinc-500 focus:bg-zinc-950 outline-none px-2 py-1 font-mono text-xs" value={(v as any)[s.id] || ''} onChange={(e) => setCell(v.id, s.id, e.target.value)} />
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right">
                    <button onClick={() => delValue(v.id)} className="text-zinc-600 hover:text-red-500"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {draft.length === 0 && (
                <tr><td colSpan={SYSTEMS.length + 2} className="px-4 py-6 text-center text-zinc-500">No values yet.</td></tr>
              )}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-zinc-800 flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={addValue}><Plus size={14} />Add value</Btn>
            <div className="ml-auto">
              <Btn size="sm" onClick={saveChanges} disabled={!dirty || update.isPending}><Save size={14} />Save changes</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
