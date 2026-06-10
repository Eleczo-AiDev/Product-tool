import type { Attribute, Master, SystemKey, ValueCell, ValuesMap } from '../api/client';

export const SYSTEMS: { id: SystemKey; label: string; color: string }[] = [
  { id: 'hiva', label: 'HIVA', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'magento', label: 'Magento', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { id: 'crm', label: 'CRM', color: 'bg-sky-100 text-sky-800 border-sky-300' },
];

const isEmpty = (v: any) => v === undefined || v === null || v === '';

export function mastersById(masters: Master[]): Record<string, Master> {
  const m: Record<string, Master> = {};
  masters.forEach((x) => (m[x.id] = x));
  return m;
}
export function attrsById(attrs: Attribute[]): Record<string, Attribute> {
  const m: Record<string, Attribute> = {};
  attrs.forEach((x) => (m[x.id] = x));
  return m;
}

/** Human-readable shared value (resolves master ids to labels). */
export function displayShared(attr: Attribute, cell: ValueCell | undefined, masters: Record<string, Master>): string {
  if (!cell) return '';
  if (attr.source === 'MASTER' && attr.masterId) {
    const m = masters[attr.masterId];
    const mv = m?.values.find((v) => v.id === cell.shared);
    return mv ? mv.label : '';
  }
  return isEmpty(cell.shared) ? '' : String(cell.shared);
}

/** Resolve one attribute for one target system: override-then-shared. */
export function resolveValue(attr: Attribute, cell: ValueCell | undefined, system: SystemKey, masters: Record<string, Master>): any {
  const c = cell || {};
  if (attr.source === 'MASTER' && attr.masterId) {
    const m = masters[attr.masterId];
    const mv = m?.values.find((v) => v.id === c.shared);
    if (!mv) return '';
    return (mv as any)[system] || mv.label || '';
  }
  const override = (c as any)[system];
  if (!isEmpty(override)) return override;
  return isEmpty(c.shared) ? '' : c.shared;
}

export function buildPayload(attrs: Attribute[], values: ValuesMap, system: SystemKey, masters: Record<string, Master>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const a of attrs) {
    const v = resolveValue(a, values[a.id], system, masters);
    if (!isEmpty(v)) out[a.code] = v;
  }
  return out;
}

export function validate(attrs: Attribute[], values: ValuesMap, masters: Record<string, Master>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const a of attrs) {
    const cell = values[a.id] || {};
    const empty = isEmpty(cell.shared);
    if (a.required && empty) {
      errors[a.id] = `${a.label} is required`;
      continue;
    }
    if (empty) continue;
    // OPTION attributes accept a value picked from the list OR a new value typed in;
    // new values are created on save, so off-list values are not errors.
    if (a.source === 'MASTER' && a.masterId) {
      const m = masters[a.masterId];
      const ok = !!m?.values.some((v) => v.id === cell.shared);
      if (!ok) errors[a.id] = `${a.label}: value not found in master`;
    }
  }
  return errors;
}
