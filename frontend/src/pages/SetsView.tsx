import React, { useEffect, useState } from 'react';
import { Plus, X, Tag, Layers, Save } from 'lucide-react';
import { useAttributes, useSets, useSetMutations, useAttributeMutations } from '../api/hooks';
import type { Attribute, AttributeSet } from '../api/client';
import { Badge, Btn, Code, Spinner, ErrorNote, inputCls } from '../components/ui';
import { attrsById } from '../lib/resolution';
import { useFlash } from '../App';

function FamilyRouting({ set, busy, onSave }: { set: AttributeSet; busy: boolean; onSave: (families: string[]) => void }) {
  const [text, setText] = useState((set.familyValues || []).join(', '));
  const dirty = text.trim() !== (set.familyValues || []).join(', ').trim();
  const families = text.split(',').map((s) => s.trim()).filter(Boolean);
  return (
    <div className="bg-zinc-800/40 border border-zinc-700 rounded-xl p-3">
      <div className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
        <Tag size={14} className="text-zinc-200" />Routing values for “{set.name}”
      </div>
      <p className="text-xs text-zinc-400 mt-0.5 mb-2">
        On import, a row lands here if its <span className="font-medium">Item Category, Subcategory, or Family</span> matches any of these. Comma-separated.
      </p>
      <div className="flex items-center gap-2">
        <input className={inputCls} value={text} placeholder="e.g. MCCB, Low Voltage Switchgears"
          onChange={(e) => setText(e.target.value)} />
        <Btn size="sm" onClick={() => onSave(families)} disabled={!dirty || busy}><Save size={14} />Save</Btn>
      </div>
      {families.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {families.map((f, i) => <Badge key={i} className="bg-zinc-800 text-zinc-200 border-zinc-700">{f}</Badge>)}
        </div>
      )}
    </div>
  );
}

export default function SetsView() {
  const flash = useFlash();
  const attrsQ = useAttributes();
  const setsQ = useSets();
  const { create, update } = useSetMutations();
  const { create: createAttr } = useAttributeMutations();
  const [openSet, setOpenSet] = useState<string | null>(null);

  useEffect(() => {
    if (!openSet && setsQ.data && setsQ.data.length) setOpenSet(setsQ.data[0].id);
  }, [setsQ.data, openSet]);

  if (attrsQ.isLoading || setsQ.isLoading) return <Spinner />;
  if (attrsQ.error || setsQ.error) return <ErrorNote error={attrsQ.error || setsQ.error} />;

  const attrs = attrsQ.data!;
  const sets = setsQ.data!;
  const aById = attrsById(attrs);
  const set = sets.find((s) => s.id === openSet) || sets[0];

  const saveGroups = (groups: { name: string; attributeIds: string[] }[], msg: string) => {
    if (!set) return;
    update.mutate({ id: set.id, dto: { groups } }, { onSuccess: () => flash(msg), onError: (e) => alert(e instanceof Error ? e.message : 'Failed') });
  };

  const addGroup = () => {
    const name = prompt('Group name', 'New group');
    if (!name || !set) return;
    saveGroups([...set.groups.map(strip), { name, attributeIds: [] }], 'Group added');
  };

  const assign = (groupId: string, attrId: string) => {
    if (!set) return;
    saveGroups(set.groups.map((g) => (g.id === groupId ? { name: g.name, attributeIds: [...g.attributeIds, attrId] } : strip(g))), 'Attribute assigned');
  };

  const createAndAdd = async (groupId: string, label: string) => {
    if (!set) return;
    const clean = label.trim();
    if (!clean) return;
    // derive a unique code from the label
    const base = clean.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
    const taken = new Set(attrs.map((a) => a.code));
    let code = base; let n = 2;
    while (taken.has(code)) code = `${base}_${n++}`;
    try {
      const created = await createAttr.mutateAsync({
        code, label: clean, inputType: 'text', required: false, source: 'FREE', unit: '', masterId: null, options: [],
      });
      saveGroups(
        set.groups.map((g) => (g.id === groupId ? { name: g.name, attributeIds: [...g.attributeIds, created.id] } : strip(g))),
        `Created “${clean}” and added it`,
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not create attribute');
    }
  };

  const unassign = (groupId: string, attrId: string) => {
    if (!set) return;
    const attr = aById[attrId];
    if (attr?.system) {
      alert('System attributes cannot be removed from a set.');
      return;
    }
    saveGroups(set.groups.map((g) => (g.id === groupId ? { name: g.name, attributeIds: g.attributeIds.filter((x) => x !== attrId) } : strip(g))), 'Attribute removed');
  };

  const newSet = () => {
    const name = prompt('New set name', '');
    if (!name) return;
    create.mutate({ name, basedOnSetId: set?.id }, {
      onSuccess: (created) => { setOpenSet(created.id); flash('Set created (cloned structure)'); },
      onError: (e) => alert(e instanceof Error ? e.message : 'Failed'),
    });
  };

  const assigned = set ? set.groups.flatMap((g) => g.attributeIds) : [];
  const pool = attrs.filter((a) => !assigned.includes(a.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-zinc-400">Each set is the template for one product type. Add attributes to groups.</p>
        </div>
        <Btn onClick={newSet}><Plus size={15} />New set</Btn>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {sets.map((s) => (
          <button key={s.id} onClick={() => setOpenSet(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${openSet === s.id ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800/60'}`}>
            {s.name}
          </button>
        ))}
      </div>

      {set && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            <FamilyRouting key={set.id} set={set} busy={update.isPending}
              onSave={(families) => update.mutate({ id: set.id, dto: { familyValues: families } }, { onSuccess: () => flash('Item Family mapping saved'), onError: (e) => alert(e instanceof Error ? e.message : 'Failed') })} />
            {set.groups.map((g) => (
              <div key={g.id} className="bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="px-4 py-2 border-b border-zinc-800 text-sm font-semibold text-zinc-200">{g.name}</div>
                <div className="divide-y divide-zinc-800">
                  {g.attributeIds.map((aid) => {
                    const a = aById[aid];
                    if (!a) return null;
                    return (
                      <div key={aid} className="px-4 py-2 flex items-center gap-2 text-sm">
                        <span className="font-medium text-zinc-200">{a.label}</span>
                        <Code>{a.code}</Code>
                        {a.required && <Badge className="bg-red-500/10 text-red-400 border-red-500/30">required</Badge>}
                        {a.source === 'MASTER' && <Badge className="bg-violet-500/10 text-violet-300 border-violet-500/30">master</Badge>}
                        {a.system && <Badge className="bg-zinc-800 text-zinc-400 border-zinc-800">system</Badge>}
                        <button onClick={() => unassign(g.id, aid)} className="ml-auto text-zinc-600 hover:text-red-500"><X size={15} /></button>
                      </div>
                    );
                  })}
                  {g.attributeIds.length === 0 && <div className="px-4 py-3 text-xs text-zinc-500">No attributes in this group.</div>}
                  <AddAttrRow pool={pool} onAdd={(aid) => assign(g.id, aid)} onCreate={(label) => createAndAdd(g.id, label)} busy={createAttr.isPending} />
                </div>
              </div>
            ))}
            <Btn variant="outline" size="sm" onClick={addGroup}><Plus size={14} />Add group</Btn>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-fit">
            <div className="text-sm font-semibold text-zinc-200 mb-2 flex items-center gap-1.5"><Tag size={14} />Not in this set</div>
            {pool.length === 0 && <div className="text-xs text-zinc-500">Every attribute is already in this set.</div>}
            <div className="space-y-1.5">
              {pool.map((a) => (
                <div key={a.id} className="text-sm flex items-center gap-2">
                  <span className="text-zinc-300">{a.label}</span><Code>{a.code}</Code>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-3">Attributes are shared across all product types. These simply aren't part of <span className="font-medium">this</span> set yet — add one only if this product type needs it.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function strip(g: { name: string; attributeIds: string[] }) {
  return { name: g.name, attributeIds: g.attributeIds };
}

function AddAttrRow({ pool, onAdd, onCreate, busy }: { pool: Attribute[]; onAdd: (aid: string) => void; onCreate: (label: string) => void; busy: boolean }) {
  const [pick, setPick] = useState('');
  const [label, setLabel] = useState('');
  const submitNew = () => { if (label.trim()) { onCreate(label.trim()); setLabel(''); } };
  return (
    <div className="px-4 py-2 bg-zinc-800/40 space-y-2">
      <div className="flex items-center gap-2">
        <select className="text-sm rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 px-2.5 py-1.5 flex-1 focus:outline-none focus:ring-1 focus:ring-zinc-500/50 focus:border-zinc-500" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">+ add an existing attribute to this group…</option>
          {pool.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <Btn size="sm" variant="ghost" disabled={!pick} onClick={() => { onAdd(pick); setPick(''); }}>Add</Btn>
      </div>
      <div className="flex items-center gap-2">
        <input
          className="text-sm rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-100 placeholder-zinc-500 px-2.5 py-1.5 flex-1 focus:outline-none focus:ring-1 focus:ring-zinc-500/50 focus:border-zinc-500"
          placeholder="…or type a new field name to create it"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submitNew(); }}
        />
        <Btn size="sm" variant="outline" disabled={!label.trim() || busy} onClick={submitNew}>Create &amp; add</Btn>
      </div>
      <p className="text-[11px] text-zinc-500">New fields are created as text. Change the type, options or mandatory flag later on the Attributes tab.</p>
    </div>
  );
}
