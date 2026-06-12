import React, { useMemo, useState } from 'react';
import {
  Plus, Trash2, Pencil, Download, Upload, Send, ChevronDown, ChevronRight,
  AlertCircle, Check, CircleCheck, CircleDashed, Layers, History, RotateCcw, Filter, Search, X,
} from 'lucide-react';
import { useAttributes, useMasters, useSets, useProducts, useProductMutations, useMasterMutations, useProductHistory, useDeletedProducts } from '../api/hooks';
import type { Attribute, AttributeSet, Master, Product, ValuesMap } from '../api/client';
import { api } from '../api/client';
import { Badge, Btn, Code, Modal, Spinner, ErrorNote, inputCls } from '../components/ui';
import { SYSTEMS, attrsById, mastersById, resolveValue, validate } from '../lib/resolution';
import { useFlash } from '../App';
import * as XLSX from 'xlsx';

export default function ProductsView() {
  const flash = useFlash();
  const attrsQ = useAttributes();
  const mastersQ = useMasters();
  const setsQ = useSets();
  const productsQ = useProducts();
  const { remove } = useProductMutations();

  const [editing, setEditing] = useState<Product | DraftProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deletedOpen, setDeletedOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [q, setQ] = useState('');
  const [setF, setSetF] = useState('');
  const [brandF, setBrandF] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  if (attrsQ.isLoading || mastersQ.isLoading || setsQ.isLoading || productsQ.isLoading) return <Spinner />;
  const err = attrsQ.error || mastersQ.error || setsQ.error || productsQ.error;
  if (err) return <ErrorNote error={err} />;

  const attrs = attrsQ.data!;
  const masters = mastersQ.data!;
  const sets = setsQ.data!;
  const products = productsQ.data!;
  const brands = Array.from(new Set(products.map((p) => p.summary.brand).filter(Boolean))).sort();
  const qLower = q.trim().toLowerCase();
  const filtered = products.filter((p) =>
    (!setF || p.setId === setF) &&
    (!brandF || p.summary.brand === brandF) &&
    (!qLower || (p.summary.code || '').toLowerCase().includes(qLower) || (p.summary.name || '').toLowerCase().includes(qLower)));
  const activeFilters = (setF ? 1 : 0) + (brandF ? 1 : 0) + (qLower ? 1 : 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);
  const aById = attrsById(attrs);
  const mById = mastersById(masters);

  const onDelete = (p: Product) => {
    if (!confirm('Delete this product?')) return;
    remove.mutate(p.id, { onSuccess: () => flash('Product deleted') });
  };

  const exportExcel = async () => {
    try {
      const res = await fetch(api.exportCsvUrl());
      const csvText = await res.text();
      const wb = XLSX.read(csvText, { type: 'string' });
      XLSX.writeFile(wb, 'products_export.xlsx');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Export failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-zinc-400">Created against an attribute set. The form is generated from the set.</p>
        </div>
        <div className="flex gap-2">
          <a href={api.exportCsvUrl()} className="inline-flex items-center gap-1.5 rounded-lg font-medium text-xs px-2.5 py-1.5 border border-zinc-700 text-zinc-200 hover:bg-zinc-800/60">
            <Download size={14} />Export CSV
          </a>
          <Btn variant="outline" size="sm" onClick={exportExcel}><Download size={14} />Export Excel</Btn>
          <Btn variant="outline" size="sm" onClick={() => setImporting(true)}><Upload size={14} />Import</Btn>
          <Btn variant={filtersOpen || activeFilters ? 'primary' : 'outline'} size="sm" onClick={() => setFiltersOpen((v) => !v)}>
            <Filter size={14} />Filters{activeFilters ? ` (${activeFilters})` : ''}
          </Btn>
          <Btn variant="ghost" size="sm" onClick={() => setDeletedOpen(true)}><Trash2 size={14} />Deleted</Btn>
          <Btn onClick={() => setCreating(true)}><Plus size={15} />New product</Btn>
        </div>
      </div>

      {filtersOpen && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-8 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/50 focus:border-zinc-500"
              placeholder="Search by code or name…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <select className="text-sm rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-500/50 focus:border-zinc-500" value={setF} onChange={(e) => { setSetF(e.target.value); setPage(1); }}>
            <option value="">All product types</option>
            {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="text-sm rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-500/50 focus:border-zinc-500" value={brandF} onChange={(e) => { setBrandF(e.target.value); setPage(1); }}>
            <option value="">All brands</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          {activeFilters > 0 && (
            <Btn variant="ghost" size="sm" onClick={() => { setQ(''); setSetF(''); setBrandF(''); setPage(1); }}><X size={14} />Clear</Btn>
          )}
        </div>
      )}

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800/40 text-zinc-500 text-[11px] uppercase tracking-wider">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-semibold">Product code</th>
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Set</th>
              <th className="px-4 py-2.5 font-semibold">Brand</th>
              <th className="px-4 py-2.5 font-semibold">Delivery</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((p) => (
              <tr key={p.id} className="border-t border-zinc-800 hover:bg-zinc-800/60">
                <td className="px-4 py-2 font-mono text-xs">{p.summary.code}</td>
                <td className="px-4 py-2">{p.summary.name}</td>
                <td className="px-4 py-2">
                  <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">{p.setName}</Badge>
                </td>
                <td className="px-4 py-2">{p.summary.brand}</td>
                <td className="px-4 py-2"><DeliveryDots deliveries={p.deliveries} /></td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <Btn variant="ghost" size="sm" onClick={() => setEditing(p)}><Pencil size={13} />Open</Btn>
                  <Btn variant="danger" size="sm" onClick={() => onDelete(p)}><Trash2 size={13} /></Btn>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No products match.</td></tr>
            )}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2 text-sm text-zinc-400">
            <div>
              Showing {pageStart + 1}–{Math.min(pageStart + pageSize, filtered.length)} of {filtered.length}
            </div>
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
      </div>

      {creating && (
        <PickSetModal sets={sets} onClose={() => setCreating(false)} onPick={(setId) => {
          setCreating(false);
          setEditing({ id: null, setId, values: {} });
        }} />
      )}

      {importing && <ImportModal sets={sets} attrs={attrs} onClose={() => setImporting(false)} />}
      {deletedOpen && <DeletedModal onClose={() => setDeletedOpen(false)} />}

      {editing && (
        <ProductEditor
          draftInit={editing}
          sets={sets}
          aById={aById}
          mById={mById}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

interface DraftProduct {
  id: string | null;
  setId: string;
  values: ValuesMap;
}

function DeliveryDots({ deliveries }: { deliveries: Record<string, string> }) {
  return (
    <div className="flex items-center gap-1.5">
      {SYSTEMS.map((s) => {
        const st = deliveries[s.id];
        const delivered = st === 'DELIVERED';
        const failed = st === 'FAILED';
        const cls = delivered ? 'text-emerald-500' : failed ? 'text-red-500' : 'text-zinc-600';
        return (
          <span key={s.id} className="flex items-center gap-0.5" title={`${s.label}: ${st || 'Not published'}`}>
            {delivered ? <CircleCheck size={14} className={cls} /> : <CircleDashed size={14} className={cls} />}
            <span className="text-xs text-zinc-400">{s.label}</span>
          </span>
        );
      })}
    </div>
  );
}

function PickSetModal({ sets, onClose, onPick }: { sets: AttributeSet[]; onClose: () => void; onPick: (id: string) => void }) {
  return (
    <Modal title="Choose attribute set" onClose={onClose}>
      <p className="text-sm text-zinc-400 mb-3">The product form is generated from the set you pick.</p>
      <div className="grid grid-cols-2 gap-3">
        {sets.map((s) => (
          <button key={s.id} onClick={() => onPick(s.id)}
            className="text-left border border-zinc-800 rounded-xl p-3 hover:border-zinc-500 hover:bg-zinc-800/40">
            <div className="font-medium text-zinc-100 flex items-center gap-1.5">
              <Layers size={15} className="text-zinc-400" />{s.name}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              {s.groups.reduce((n, g) => n + g.attributeIds.length, 0)} attributes · {s.groups.length} groups
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function ImportModal({ sets, attrs, onClose }: { sets: AttributeSet[]; attrs: Attribute[]; onClose: () => void }) {
  const flash = useFlash();
  const { importCsv } = useProductMutations();
  const [setId, setSetId] = useState('');
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<{ created: number; errors: any[]; matched: string[]; ignored: string[]; addedMasterValues: string[]; usedSetColumn: boolean } | null>(null);

  const SET_HEADER_RE = /^(set|attribute[ _]?set|product set)$/i;

  // mirror of the backend header matcher, for a live preview before import
  const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const lookup = useMemo(() => {
    const m: Record<string, Attribute> = {};
    attrs.forEach((a) => { m[a.code.toLowerCase()] = a; m[norm(a.code)] = a; m[a.label.toLowerCase().trim()] = a; m[norm(a.label)] = a; });
    return m;
  }, [attrs]);

  const headers = useMemo(() => {
    const first = csv.split(/\r?\n/).find((l) => l.trim());
    if (!first) return [] as { raw: string; attr?: Attribute; routing?: boolean }[];
    return first.split(',').map((h) => h.replace(/^"|"$/g, '').trim()).filter(Boolean)
      .map((raw) => SET_HEADER_RE.test(raw)
        ? { raw, routing: true }
        : { raw, attr: lookup[raw.toLowerCase()] || lookup[norm(raw)] });
  }, [csv, lookup]);

  const dataRows = csv ? csv.split(/\r?\n/).filter((l) => l.trim()).length - 1 : 0;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setResult(null);
    const lower = f.name.toLowerCase();
    try {
      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        setCsv(XLSX.utils.sheet_to_csv(ws));
      } else {
        setCsv(await f.text());
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not read that file');
    }
  };

  const run = async () => {
    if (!csv) {
      alert('Choose a file first.');
      return;
    }
    try {
      const res = await importCsv.mutateAsync({ setId, csv });
      const extras: string[] = [];
      if (res.ignored.length) extras.push(`${res.ignored.length} column(s) ignored`);
      if (res.addedMasterValues.length) extras.push(`${res.addedMasterValues.length} new master value(s) added`);
      const summary = `Imported ${res.created} product(s)` + (extras.length ? ` · ${extras.join(' · ')}` : '');
      if (res.errors.length === 0) {
        flash(summary);
        onClose(); // clean import → close automatically
      } else {
        setResult(res); // keep open so the failed rows are visible
        flash(summary);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed');
    }
  };

  const matchedCount = headers.filter((h) => h.attr).length;

  return (
    <Modal title="Import products from CSV or Excel" onClose={onClose}>
      <p className="text-sm text-zinc-400 mb-3">
        Upload a <span className="font-medium">CSV or Excel</span> file. Columns are matched by label or code. Each row is routed to a
        product type by matching its <span className="font-medium">Item Category / Subcategory / Family</span> against the routing values set on each
        set (Attribute Sets tab). Or pick a single type below to force every row there.
      </p>

      <label className="block mb-3">
        <div className="text-sm font-medium text-zinc-200 mb-1">Product type</div>
        <select className={inputCls} value={setId} onChange={(e) => setSetId(e.target.value)}>
          <option value="">Auto-detect by category</option>
          {sets.map((s) => <option key={s.id} value={s.id}>All rows → {s.name}</option>)}
        </select>
        <div className="text-xs text-zinc-500 mt-1">
          {setId ? 'Every row goes to this product type.' : 'Rows route by category. A row that matches no set is reported and skipped.'}
        </div>
      </label>

      <label className="block mb-3">
        <div className="text-sm font-medium text-zinc-200 mb-1">CSV or Excel file</div>
        <input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={onFile}
          className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-zinc-200 hover:file:bg-zinc-700" />
        {fileName && <div className="text-xs text-zinc-500 mt-1">{fileName} · {dataRows} data row(s) · {matchedCount}/{headers.length} columns recognized</div>}
      </label>

      {headers.length > 0 && (
        <div className="mb-4 border border-zinc-800 rounded-lg p-2.5">
          <div className="text-xs font-medium text-zinc-400 mb-1.5">Detected columns</div>
          <div className="flex flex-wrap gap-1.5">
            {headers.map((h, i) => (
              h.routing
                ? <Badge key={i} className="bg-zinc-800 text-zinc-300 border-zinc-700">{h.raw} → routes each row</Badge>
                : h.attr
                  ? <Badge key={i} className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">{h.raw} → {h.attr.code}</Badge>
                  : <Badge key={i} className="bg-zinc-800 text-zinc-500 border-zinc-800 line-through">{h.raw}</Badge>
            ))}
          </div>
          {matchedCount === 0 && <div className="text-xs text-red-400 mt-2 flex items-center gap-1"><AlertCircle size={12} />No columns matched — check the header row.</div>}
        </div>
      )}

      {result && (
        <div className="mb-4 text-sm space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-300"><Check size={14} />Created {result.created} product(s).</div>
          {result.ignored.length > 0 && (
            <div className="text-xs text-zinc-400">Ignored columns: {result.ignored.join(', ')}</div>
          )}
          {result.addedMasterValues.length > 0 && (
            <div className="text-xs text-violet-400">New master values added: {result.addedMasterValues.join(', ')}</div>
          )}
          {result.errors.length > 0 && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2 text-xs text-red-300">
              <div className="font-medium mb-1 flex items-center gap-1"><AlertCircle size={12} />{result.errors.length} row(s) had problems:</div>
              <ul className="list-disc ml-4 space-y-0.5">
                {result.errors.slice(0, 8).map((e, i) => (
                  <li key={i}>{typeof e === 'string' ? e : `row ${e.row}: ${e.error}`}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3">
        <Btn variant="ghost" onClick={onClose}>{result ? 'Close' : 'Cancel'}</Btn>
        <Btn onClick={run} disabled={!csv || matchedCount === 0 || importCsv.isPending}><Upload size={15} />Import {dataRows > 0 ? `${dataRows} row(s)` : ''}</Btn>
      </div>
    </Modal>
  );
}

function ProductEditor({
  draftInit, sets, aById, mById, onClose,
}: {
  draftInit: Product | DraftProduct;
  sets: AttributeSet[];
  aById: Record<string, Attribute>;
  mById: Record<string, Master>;
  onClose: () => void;
}) {
  const flash = useFlash();
  const { create, update, publish } = useProductMutations();
  const [showHistory, setShowHistory] = useState(false);
  const productId = (draftInit as any).id as string | null;
  const { update: updateMaster } = useMasterMutations();
  const addMasterValue = async (masterId: string, label: string): Promise<string | null> => {
    const m = mById[masterId];
    if (!m) return null;
    const trimmed = label.trim();
    const existing = m.values.find((v) => v.label.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const values = [
      ...m.values.map((v) => ({ id: v.id, label: v.label, hiva: v.hiva, magento: v.magento, crm: v.crm })),
      { label: trimmed, hiva: trimmed, magento: trimmed, crm: trimmed },
    ];
    const updated = await updateMaster.mutateAsync({ id: masterId, dto: { values } });
    const nv = updated?.values?.find((v) => v.label.toLowerCase() === trimmed.toLowerCase());
    return nv ? nv.id : null;
  };
  const set = sets.find((s) => s.id === draftInit.setId)!;
  const [draft, setDraft] = useState<DraftProduct>(() => ({
    id: draftInit.id,
    setId: draftInit.setId,
    values: JSON.parse(JSON.stringify(draftInit.values || {})),
  }));
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({});
  const [showPayload, setShowPayload] = useState(false);

  const orderedAttrs = useMemo(
    () => set.groups.flatMap((g) => g.attributeIds).map((id) => aById[id]).filter(Boolean),
    [set, aById],
  );
  const errors = useMemo(() => validate(orderedAttrs, draft.values, mById), [orderedAttrs, draft, mById]);
  const errorCount = Object.keys(errors).length;
  const busy = create.isPending || update.isPending || publish.isPending;

  const setVal = (aid: string, key: string, value: any) =>
    setDraft((d) => ({ ...d, values: { ...d.values, [aid]: { ...(d.values[aid] || {}), [key]: value } } }));

  const persist = async (): Promise<string> => {
    const dto = { setId: draft.setId, values: draft.values };
    const existingId = draftInit.id;
    if (existingId) {
      await update.mutateAsync({ id: existingId, dto });
      return existingId;
    }
    const created = await create.mutateAsync(dto);
    setDraft((d) => ({ ...d, id: created.id }));
    return created.id;
  };

  const codeAttr = orderedAttrs.find((a) => a.code === 'product_code');
  const productCode = codeAttr ? String(draft.values[codeAttr.id]?.shared ?? '').trim() : '';

  const onSave = async () => {
    if (!productCode) {
      alert('Please enter a Product code before saving.');
      return;
    }
    try {
      await persist();
      flash(draftInit.id ? 'Product updated' : 'Product saved');
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const onPublish = async () => {
    if (errorCount > 0) return;
    try {
      const id = await persist();
      await publish.mutateAsync(id);
      flash('Published — queued to HIVA, Magento & CRM');
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Publish failed');
    }
  };

  return (
    <Modal title={`${set.name} product`} onClose={onClose} wide>
      <div className="flex items-center justify-between mb-3">
        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
          <Layers size={12} className="mr-1" />{set.name}
        </Badge>
        <div className="text-xs">
          {errorCount > 0 ? (
            <span className="text-red-400 flex items-center gap-1"><AlertCircle size={13} />{errorCount} field(s) need attention</span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1"><Check size={13} />Ready to publish</span>
          )}
        </div>
      </div>

      <div className="max-h-[55vh] overflow-y-auto pr-1">
        {set.groups.map((g) => (
          <div key={g.id} className="mb-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 border-b border-zinc-800 pb-1 mb-3">
              {g.name}
            </div>
            {g.attributeIds.map((aid) => {
              const attr = aById[aid];
              if (!attr) return null;
              return (
                <AttrInput
                  key={aid}
                  attr={attr}
                  cell={draft.values[aid]}
                  mById={mById}
                  setVal={setVal}
                  addMasterValue={addMasterValue}
                  error={errors[aid]}
                  open={!!openOverrides[aid]}
                  toggle={() => setOpenOverrides((o) => ({ ...o, [aid]: !o[aid] }))}
                />
              );
            })}
          </div>
        ))}
      </div>

      {showPayload && <PayloadPreview attrs={orderedAttrs} values={draft.values} mById={mById} />}
      {showHistory && productId && (
        <HistoryPanel productId={productId} onRestored={() => { flash('Product restored to the selected version'); onClose(); }} />
      )}

      <div className="flex items-center gap-2 border-t border-zinc-800 pt-3 mt-2">
        <Btn variant="outline" size="sm" onClick={() => setShowPayload((v) => !v)}>
          {showPayload ? 'Hide' : 'Preview'} per-system payload
        </Btn>
        {productId && (
          <Btn variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}>
            <History size={14} />{showHistory ? 'Hide' : 'History'}
          </Btn>
        )}
        <div className="ml-auto flex gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="outline" onClick={onSave} disabled={busy}>Save draft</Btn>
          <Btn variant="dark" onClick={onPublish} disabled={errorCount > 0 || busy}><Send size={14} />Publish</Btn>
        </div>
      </div>
    </Modal>
  );
}

function relTime(iso?: string | null): string {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return Math.floor(d / 60) + ' min ago';
  if (d < 86400) return Math.floor(d / 3600) + ' hr ago';
  if (d < 604800) return Math.floor(d / 86400) + ' days ago';
  return new Date(iso).toLocaleDateString();
}

function DeletedModal({ onClose }: { onClose: () => void }) {
  const flash = useFlash();
  const delQ = useDeletedProducts(true);
  const { restore } = useProductMutations();
  const items = delQ.data || [];
  return (
    <Modal title="Recently deleted" onClose={onClose}>
      <p className="text-sm text-zinc-400 mb-3">Deleted products are kept here and can be restored at any time — there is no automatic purge, so nothing is lost. Restoring brings the product back exactly as it was.</p>
      {delQ.isLoading && <div className="text-sm text-zinc-500 py-4">Loading…</div>}
      {!delQ.isLoading && items.length === 0 && <div className="text-sm text-zinc-500 py-6 text-center">Nothing deleted.</div>}
      <div className="divide-y divide-zinc-800">
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-2 text-sm">
            <Code>{p.summary.code || '—'}</Code>
            <span className="text-zinc-200 truncate">{p.summary.name || '(no name)'}</span>
            <span className="text-zinc-500 text-xs">{p.setName}</span>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-zinc-500 whitespace-nowrap" title={p.deletedAt ? new Date(p.deletedAt).toLocaleString() : ''}>deleted {relTime(p.deletedAt)}</span>
              <Btn size="sm" variant="outline" disabled={restore.isPending}
                onClick={() => restore.mutate(p.id, { onSuccess: () => flash('Product restored') })}>
                <RotateCcw size={13} />Restore
              </Btn>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function HistoryPanel({ productId, onRestored }: { productId: string; onRestored: () => void }) {
  const histQ = useProductHistory(productId);
  const { revert } = useProductMutations();
  const tone: Record<string, string> = {
    created: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    updated: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    published: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    reverted: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
    restored: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    deleted: 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  if (histQ.isLoading) return <div className="text-sm text-zinc-500 py-3">Loading history…</div>;
  const revs = histQ.data || [];
  if (!revs.length) return <div className="text-sm text-zinc-500 py-3">No history yet.</div>;
  return (
    <div className="mt-3 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-3 py-2 text-xs font-semibold text-zinc-400 bg-zinc-800/40 border-b border-zinc-800">Change history — newest first</div>
      <div className="divide-y divide-zinc-800 max-h-64 overflow-auto">
        {revs.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2 px-3 py-2 text-sm">
            <Badge className={tone[r.action] || ''}>{r.action}</Badge>
            <span className="text-zinc-500 text-xs">v{r.version}</span>
            <span className="text-zinc-300 truncate">{r.summary?.name || r.summary?.code || '—'}</span>
            {r.note && <span className="text-xs text-zinc-500 italic truncate">· {r.note}</span>}
            <span className="ml-auto text-xs text-zinc-500 whitespace-nowrap">{new Date(r.at).toLocaleString()} · {r.actor}</span>
            {i === 0 ? (
              <span className="text-xs text-zinc-500 pl-1">current</span>
            ) : (
              <Btn size="sm" variant="outline" disabled={revert.isPending}
                onClick={() => {
                  if (!confirm(`Restore the product to v${r.version}? The current values will be replaced (this is itself recorded in history).`)) return;
                  revert.mutate({ id: productId, revisionId: r.id }, { onSuccess: onRestored, onError: (e) => alert(e instanceof Error ? e.message : 'Restore failed') });
                }}>
                <RotateCcw size={13} />Restore
              </Btn>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Combobox({
  value, options, onPick, onAddNew, placeholder, addLabel,
}: {
  value: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
  onAddNew?: (text: string) => void | Promise<void>;
  placeholder?: string;
  addLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);
  const currentLabel = options.find((o) => o.value === value)?.label ?? (value || '');
  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = q.trim() ? options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase())) : options;
  const exact = options.some((o) => o.label.toLowerCase() === q.trim().toLowerCase());
  return (
    <div className="relative" ref={ref}>
      <div className="flex items-stretch">
        <input
          className={inputCls}
          value={open ? q : currentLabel}
          placeholder={placeholder || 'Select or type…'}
          onFocus={() => { setOpen(true); setQ(''); }}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        />
        <button type="button" tabIndex={-1} onClick={() => setOpen((o) => !o)}
          className="ml-1 px-2 rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800/60">▾</button>
      </div>
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg">
          {filtered.map((o) => (
            <button type="button" key={o.value} onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(o.value); setOpen(false); }}
              className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-800 ${o.value === value ? 'bg-zinc-800 font-medium' : ''}`}>
              {o.label}
            </button>
          ))}
          {filtered.length === 0 && !q.trim() && <div className="px-3 py-2 text-sm text-zinc-500">No options yet — type to add one</div>}
          {onAddNew && q.trim() && !exact && (
            <button type="button" onMouseDown={(e) => e.preventDefault()}
              onClick={async () => { await onAddNew(q.trim()); setOpen(false); }}
              className="block w-full text-left px-3 py-1.5 text-sm text-zinc-200 border-t border-zinc-800">
              ＋ {addLabel || 'Add'} “{q.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AttrInput({
  attr, cell, mById, setVal, addMasterValue, error, open, toggle,
}: {
  attr: Attribute;
  cell: any;
  mById: Record<string, Master>;
  setVal: (aid: string, key: string, value: any) => void;
  addMasterValue: (masterId: string, label: string) => Promise<string | null>;
  error?: string;
  open: boolean;
  toggle: () => void;
}) {
  const v = cell || {};
  const isMaster = attr.source === 'MASTER';
  const master = isMaster && attr.masterId ? mById[attr.masterId] : null;

  const sharedControl = () => {
    if (attr.inputType === 'list' && isMaster && master) {
      return (
        <Combobox
          value={v.shared || ''}
          options={master.values.map((mv) => ({ value: mv.id, label: mv.label }))}
          onPick={(val) => setVal(attr.id, 'shared', val)}
          onAddNew={async (text) => { const id = await addMasterValue(master.id, text); if (id) setVal(attr.id, 'shared', id); }}
          placeholder={`Select ${master.name}…`}
          addLabel={`Add ${master.name}`}
        />
      );
    }
    if (attr.inputType === 'list') {
      return (
        <Combobox
          value={v.shared || ''}
          options={attr.options.map((o) => ({ value: o.label, label: o.label }))}
          onPick={(val) => setVal(attr.id, 'shared', val)}
          onAddNew={(text) => setVal(attr.id, 'shared', text)}
          placeholder="Select an option or type a new value"
        />
      );
    }
    const isNum = attr.inputType === 'number';
    return (
      <div className="flex items-center gap-2">
        <input
          className={`${inputCls}${isNum ? ' [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none' : ''}`}
          type={isNum ? 'number' : attr.inputType === 'date' ? 'date' : 'text'}
          {...(isNum ? { step: 'any', inputMode: 'decimal', onWheel: (e: any) => e.currentTarget.blur() } : {})}
          value={v.shared ?? ''}
          onChange={(e) => setVal(attr.id, 'shared', e.target.value)}
        />
        {attr.unit && <span className="text-sm text-zinc-500 whitespace-nowrap">{attr.unit}</span>}
      </div>
    );
  };

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium text-zinc-200 flex items-center gap-2">
          {attr.label}
          {attr.required && <span className="text-red-500">*</span>}
          <Code>{attr.code}</Code>
          {isMaster && <Badge className="bg-violet-500/10 text-violet-300 border-violet-500/30">master</Badge>}
        </div>
        {!isMaster && (
          <button onClick={toggle} className="text-xs text-zinc-500 hover:text-zinc-200 flex items-center gap-1">
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} per-system
          </button>
        )}
      </div>
      {sharedControl()}
      {error && (
        <div className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={12} />{error}</div>
      )}

      {isMaster && v.shared && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {SYSTEMS.map((s) => (
            <Badge key={s.id} className={s.color}>
              {s.label}: {resolveValue(attr, v, s.id, mById) || '—'}
            </Badge>
          ))}
          <span className="text-xs text-zinc-500 self-center">derived from master</span>
        </div>
      )}

      {!isMaster && open && (
        <div className="mt-2 grid grid-cols-3 gap-2 bg-zinc-800/40 rounded-lg p-2 border border-zinc-800">
          {SYSTEMS.map((s) => (
            <div key={s.id}>
              <div className="text-xs font-medium text-zinc-400 mb-1">{s.label}</div>
              <input
                className={`${inputCls}${attr.inputType === 'number' ? ' [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none' : ''}`}
                type={attr.inputType === 'number' ? 'number' : 'text'}
                {...(attr.inputType === 'number' ? { step: 'any', inputMode: 'decimal' as const, onWheel: (e: any) => e.currentTarget.blur() } : {})}
                placeholder={(v.shared ?? '') + ' (shared)'}
                value={v[s.id] ?? ''}
                onChange={(e) => setVal(attr.id, s.id, e.target.value)}
              />
            </div>
          ))}
          <div className="col-span-3 text-xs text-zinc-500">Leave blank to use the shared value.</div>
        </div>
      )}
    </div>
  );
}

function PayloadPreview({ attrs, values, mById }: { attrs: Attribute[]; values: ValuesMap; mById: Record<string, Master> }) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-3">
      {SYSTEMS.map((s) => {
        const payload = attrs.reduce((acc, a) => {
          const val = resolveValue(a, values[a.id], s.id, mById);
          if (val !== '' && val !== undefined && val !== null) acc[a.code] = val;
          return acc;
        }, {} as Record<string, any>);
        return (
          <div key={s.id} className="border border-zinc-800 rounded-xl overflow-hidden">
            <div className={`px-3 py-1.5 text-xs font-semibold border-b ${s.color}`}>{s.label} payload</div>
            <pre className="text-[11px] leading-relaxed p-3 overflow-x-auto text-zinc-200 bg-zinc-800/40/60">
{JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        );
      })}
    </div>
  );
}
