import React, { useState } from 'react';
import { Plus, Trash2, Pencil, Check, Filter, Search, X } from 'lucide-react';
import { useAttributes, useMasters, useSets, useAttributeMutations, useSetMutations } from '../api/hooks';
import type { Attribute, Master, Source, AttributeSet } from '../api/client';
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [setFilter, setSetFilter] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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
  const activeFilters = (setFilter ? 1 : 0) + (q ? 1 : 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

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
        <p className="text-sm text-zinc-400">The building blocks. Add a field, choose which product types use it, and it appears on every product of those types.</p>
        <div className="flex gap-2">
          <Btn variant={filtersOpen || activeFilters ? 'primary' : 'outline'} size="sm" onClick={() => setFiltersOpen((v) => !v)}>
            <Filter size={14} />Filters{activeFilters ? ` (${activeFilters})` : ''}
          </Btn>
          <Btn onClick={() => setEditing({ id: null })}><Plus size={15} />New attribute</Btn>
        </div>
      </div>

      {filtersOpen && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-8 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/50 focus:border-zinc-500"
              placeholder="Search by name or code…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            />
          </div>
          <select className="text-sm rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-500/50 focus:border-zinc-500" value={setFilter} onChange={(e) => { setSetFilter(e.target.value); setPage(1); }}>
            <option value="">All product types</option>
            {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {activeFilters > 0 && (
            <Btn variant="ghost" size="sm" onClick={() => { setSetFilter(''); setQuery(''); setPage(1); }}><X size={14} />Clear</Btn>
          )}
        </div>
      )}

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800/40 text-zinc-500 text-[11px] uppercase tracking-wider">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-semibold">Label</th>
              <th className="px-4 py-2.5 font-semibold">Code</th>
              <th className="px-4 py-2.5 font-semibold">Type</th>
              <th className="px-4 py-2.5 font-semibold">Source</th>
              <th className="px-4 py-2.5 font-semibold">Required</th>
              <th className="px-4 py-2.5 font-semibold">Used in</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((a) => (
              <tr key={a.id} className="border-t border-zinc-800 hover:bg-zinc-800/60">
                <td className="px-4 py-2.5 font-medium text-zinc-200">
                  {a.label}{a.unit && <span className="text-zinc-500 font-normal"> ({a.unit})</span>}
                </td>
                <td className="px-4 py-2.5"><Code>{a.code}</Code></td>
                <td className="px-4 py-2.5 text-zinc-300">{a.inputType}</td>
                <td className="px-4 py-2.5">
                  {a.source === 'MASTER' ? <Badge className="bg-violet-500/10 text-violet-300 border-violet-500/30">master</Badge> : a.source.toLowerCase()}
                </td>
                <td className="px-4 py-2.5">
                  {a.required ? <Badge className="bg-red-500/10 text-red-400 border-red-500/30">required</Badge> : <span className="text-zinc-500">optional</span>}
                </td>
                <td className="px-4 py-2.5">
                  {(memberSets[a.id] || []).length === 0
                    ? <span className="text-zinc-600">—</span>
                    : <span className="flex flex-wrap gap-1">{memberSets[a.id].map((n) => <Badge key={n} className="bg-zinc-800 text-zinc-300 border-zinc-800">{n}</Badge>)}</span>}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
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
      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-3 text-sm text-zinc-400">
          <div>Showing {pageStart + 1}–{Math.min(pageStart + pageSize, filtered.length)} of {filtered.length}</div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-xs">
              Rows
              <select
                className="rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 px-1.5 py-1"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <Btn variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Prev</Btn>
              <span className="px-1">Page {currentPage} / {totalPages}</span>
              <Btn variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next</Btn>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <AttributeEditor
          attr={editing}
          masters={masters}
          sets={sets}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); flash('Attribute saved'); }}
        />
      )}
    </div>
  );
}

function AttributeEditor({
  attr, masters, sets, onClose, onSaved,
}: {
  attr: Attribute | { id: null };
  masters: Master[];
  sets: AttributeSet[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !('code' in attr);
  const existing = isNew ? null : (attr as Attribute);
  const { create, update } = useAttributeMutations();
  const { update: updateSet } = useSetMutations();

  const initialSetIds = existing
    ? sets.filter((s) => s.groups.some((g) => g.attributeIds.includes(existing.id))).map((s) => s.id)
    : [];
  const [setIds, setSetIds] = useState<Set<string>>(new Set(initialSetIds));
  const toggleSet = (id: string) =>
    setSetIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

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
  const [busy, setBusy] = useState(false);

  // add/remove this attribute from each set so membership matches the checkboxes
  const syncMembership = async (attrId: string) => {
    for (const s of sets) {
      const inSet = s.groups.some((g) => g.attributeIds.includes(attrId));
      const want = setIds.has(s.id);
      if (inSet === want) continue;
      let groups = s.groups.map((g) => ({ name: g.name, attributeIds: [...g.attributeIds] }));
      if (want) {
        if (groups.length === 0) groups = [{ name: 'General', attributeIds: [] }];
        if (!groups[0].attributeIds.includes(attrId)) groups[0].attributeIds.push(attrId);
      } else {
        groups = groups.map((g) => ({ name: g.name, attributeIds: g.attributeIds.filter((id) => id !== attrId) }));
      }
      await updateSet.mutateAsync({ id: s.id, dto: { groups } });
    }
  };

  const save = async () => {
    if (!d.label || !d.code) { alert('Code and label are required.'); return; }
    let source: Source = d.source;
    if (d.inputType !== 'list') source = 'FREE';
    else if (source !== 'MASTER' && source !== 'OPTION') source = 'OPTION';

    let options: string[] = [];
    if (d.inputType === 'list' && source === 'OPTION') {
      options = optText.split(',').map((s) => s.trim()).filter(Boolean);
    }
    const dto: any = {
      code: d.code, label: d.label, inputType: d.inputType, required: d.required,
      source, unit: d.unit, masterId: source === 'MASTER' ? d.masterId : null, options,
    };
    setBusy(true);
    try {
      const saved: any = d.id
        ? await update.mutateAsync({ id: d.id, dto })
        : await create.mutateAsync(dto);
      await syncMembership(saved.id);
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

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

      <Field label="Used in (product types)" hint="tick every type that should show this field">
        <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 max-h-40 overflow-auto space-y-0.5">
          {sets.length === 0 && <div className="text-xs text-zinc-500 px-1 py-1">No product types yet — create one on the Attribute Sets screen.</div>}
          {sets.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm text-zinc-200 px-1.5 py-1 rounded hover:bg-zinc-800 cursor-pointer">
              <input type="checkbox" checked={setIds.has(s.id)} onChange={() => toggleSet(s.id)} className="rounded" />
              {s.name}
            </label>
          ))}
        </div>
      </Field>

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
