import React, { useState } from 'react';
import { Plus, Trash2, Pencil, Check } from 'lucide-react';
import { useAttributes, useMasters, useSets, useAttributeMutations } from '../api/hooks';
import type { Attribute, Master, Source } from '../api/client';
import { Badge, Btn, Code, Field, Modal, Spinner, ErrorNote, inputCls } from '../components/ui';
import { useFlash } from '../App';

interface EditDraft {
  id: string | null;
  code: string;
  label: string;
  inputType: string;
  required: boolean;
  source: Source;
  masterId: string | null;
  unit: string;
  options: { id?: string; label: string }[];
}

export default function AttributesView() {
  const flash = useFlash();
  const attrsQ = useAttributes();
  const setsQ = useSets();
  const mastersQ = useMasters();
  const { remove } = useAttributeMutations();
  const [editing, setEditing] = useState<Attribute | { id: null } | null>(null);
  const [setFilter, setSetFilter] = useState('');
  const [query, setQuery] = useState('');

  if (attrsQ.isLoading || setsQ.isLoading || mastersQ.isLoading) return <Spinner />;
  if (attrsQ.error || setsQ.error || mastersQ.error) return <ErrorNote error={attrsQ.error || setsQ.error || mastersQ.error} />;

  const attrs = attrsQ.data!;
  const sets = setsQ.data!;
  const masters = mastersQ.data!;

  const memberSets: Record<string, string[]> = {};
  sets.forEach((s) => s.groups.flatMap((g) => g.attributeIds).forEach((aid) => { (memberSets[aid] ||= []).push(s.name); }));
  const selSet = sets.find((s) => s.id === setFilter);
  const selIds = selSet ? new Set(selSet.groups.flatMap((g) => g.attributeIds)) : null;
  const q = query.trim().toLowerCase();
  const filtered = attrs.filter((a) =>
    (!selIds || selIds.has(a.id)) &&
    (!q || a.label.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)));

  const onRemove = (a: Attribute) => {
    if (a.system) { alert('System attributes cannot be deleted.'); return; }
    const usedIn = sets.filter((s) => s.groups.flatMap((g) => g.attributeIds).includes(a.id)).map((s) => s.name);
    if (usedIn.length) { alert(`Remove it from these sets first: ${usedIn.join(', ')}`); return; }
    if (!confirm(`Delete attribute "${a.label}"?`)) return;
    remove.mutate(a.id, { onSuccess: () => flash('Attribute deleted'), onError: (e) => alert(e instanceof Error ? e.message : 'Failed') });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-zinc-400">The building blocks. Add one, then assign it to a set — it appears on every product of that type.</p>
        </div>
        <Btn onClick={() => setEditing({ id: null })}><Plus size={15} />New attribute</Btn>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="text-sm text-zinc-400">Product type</label>
        <select className="text-sm rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-500/50 focus:border-zinc-500" value={setFilter} onChange={(e) => setSetFilter(e.target.value)}>
          <option value="">All product types</option>
          {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input
          className="text-sm rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-100 placeholder-zinc-500 px-2.5 py-1.5 flex-1 min-w-[180px] focus:outline-none focus:ring-1 focus:ring-zinc-500/50 focus:border-zinc-500"
          placeholder="Search by name or code…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="text-xs text-zinc-500">{filtered.length} of {attrs.length}</span>
        {(setFilter || query) && (
          <Btn size="sm" variant="ghost" onClick={() => { setSetFilter(''); setQuery(''); }}>Clear</Btn>
        )}
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800/40 text-zinc-400 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Label</th>
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Required</th>
              <th className="px-4 py-2 font-medium">Used in</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-t border-zinc-800 hover:bg-zinc-800/60">
                <td className="px-4 py-2 font-medium text-zinc-200">
                  {a.label}{a.unit && <span className="text-zinc-500 font-normal"> ({a.unit})</span>}
                </td>
                <td className="px-4 py-2"><Code>{a.code}</Code></td>
                <td className="px-4 py-2 text-zinc-300">{a.inputType}</td>
                <td className="px-4 py-2">
                  {a.source === 'MASTER' ? <Badge className="bg-violet-500/10 text-violet-300 border-violet-500/30">master</Badge> : a.source.toLowerCase()}
                </td>
                <td className="px-4 py-2">
                  {a.required ? <Badge className="bg-red-500/10 text-red-400 border-red-500/30">required</Badge> : <span className="text-zinc-500">optional</span>}
                </td>
                <td className="px-4 py-2">
                  {(memberSets[a.id] || []).length === 0
                    ? <span className="text-zinc-600">—</span>
                    : <span className="flex flex-wrap gap-1">{memberSets[a.id].map((n) => <Badge key={n} className="bg-zinc-800 text-zinc-300 border-zinc-800">{n}</Badge>)}</span>}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {a.system ? (
                    <Badge className="bg-zinc-800 text-zinc-400 border-zinc-800">system</Badge>
                  ) : (
                    <>
                      <Btn variant="ghost" size="sm" onClick={() => setEditing(a)}><Pencil size={13} /></Btn>
                      <Btn variant="danger" size="sm" onClick={() => onRemove(a)}><Trash2 size={13} /></Btn>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-500">No attributes match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <AttributeEditor
          attr={editing}
          masters={masters}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); flash('Attribute saved'); }}
        />
      )}
    </div>
  );
}

function AttributeEditor({
  attr, masters, onClose, onSaved,
}: {
  attr: Attribute | { id: null };
  masters: Master[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !('code' in attr);
  const existing = isNew ? null : (attr as Attribute);
  const { create, update } = useAttributeMutations();

  const [d, setD] = useState<EditDraft>(() => ({
    id: existing?.id ?? null,
    code: existing?.code ?? '',
    label: existing?.label ?? '',
    inputType: existing?.inputType ?? 'text',
    required: existing?.required ?? false,
    source: existing?.source ?? 'FREE',
    masterId: existing?.masterId ?? null,
    unit: existing?.unit ?? '',
    options: existing?.options ?? [],
  }));
  const [optText, setOptText] = useState((existing?.options ?? []).map((o) => o.label).join(', '));
  const set = <K extends keyof EditDraft>(k: K, v: EditDraft[K]) => setD((x) => ({ ...x, [k]: v }));

  const save = () => {
    if (!d.label || !d.code) { alert('Code and label are required.'); return; }
    let source: Source = d.source;
    if (d.inputType !== 'list') source = 'FREE';
    else if (source !== 'MASTER' && source !== 'OPTION') source = 'OPTION';

    let options: string[] = [];
    if (d.inputType === 'list' && source === 'OPTION') {
      options = optText.split(',').map((s) => s.trim()).filter(Boolean);
    }
    const dto: any = {
      code: d.code,
      label: d.label,
      inputType: d.inputType,
      required: d.required,
      source,
      unit: d.unit,
      masterId: source === 'MASTER' ? d.masterId : null,
      options,
    };
    const onError = (e: unknown) => alert(e instanceof Error ? e.message : 'Save failed');
    if (d.id) update.mutate({ id: d.id, dto }, { onSuccess: onSaved, onError });
    else create.mutate(dto, { onSuccess: onSaved, onError });
  };

  const busy = create.isPending || update.isPending;

  return (
    <Modal title={isNew ? 'New attribute' : 'Edit attribute'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Label" required><input className={inputCls} value={d.label} onChange={(e) => set('label', e.target.value)} /></Field>
        <Field label="Code" required hint={isNew ? 'lowercase letters, numbers & underscores · immutable once created' : 'immutable'}>
          <input
            className={inputCls + (isNew ? '' : ' bg-zinc-800')}
            disabled={!isNew}
            value={d.code}
            onChange={(e) => set('code', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Input type" hint={isNew ? 'Text, Number, List (dropdown), Yes/No, or Date — how the value is entered' : 'data type is immutable'}>
          <select className={inputCls} value={d.inputType} disabled={!isNew} onChange={(e) => set('inputType', e.target.value)}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="list">List (dropdown)</option>
            <option value="boolean">Yes / No</option>
            <option value="date">Date</option>
          </select>
        </Field>
        <Field label="Unit (optional)" hint="e.g. A, kA, sq mm">
          <input className={inputCls} value={d.unit} onChange={(e) => set('unit', e.target.value)} />
        </Field>
      </div>

      {d.inputType === 'list' && (
        <>
          <Field label="Value source">
            <select className={inputCls} value={d.source === 'MASTER' ? 'MASTER' : 'OPTION'} onChange={(e) => set('source', e.target.value as Source)}>
              <option value="OPTION">Fixed option list</option>
              <option value="MASTER">Backed by a master</option>
            </select>
          </Field>
          {d.source === 'MASTER' ? (
            <Field label="Master">
              <select className={inputCls} value={d.masterId || ''} onChange={(e) => set('masterId', e.target.value)}>
                <option value="">— select master —</option>
                {masters.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
          ) : (
            <Field label="Options" hint="comma-separated">
              <input className={inputCls} value={optText} onChange={(e) => setOptText(e.target.value)} placeholder="1P, 2P, 3P, 4P" />
            </Field>
          )}
        </>
      )}

      <label className="flex items-center gap-2 text-sm text-zinc-200 mt-1 mb-4">
        <input type="checkbox" checked={d.required} onChange={(e) => set('required', e.target.checked)} className="rounded" />
        Mandatory (must be filled before publish)
      </label>

      <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3">
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={busy}><Check size={15} />Save attribute</Btn>
      </div>
    </Modal>
  );
}
