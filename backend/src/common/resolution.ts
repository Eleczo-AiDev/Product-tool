/**
 * Pure, framework-free resolution + validation logic.
 * These functions are the "brain" of the tool and are unit-tested
 * independently of NestJS / Prisma (see common/resolution.spec).
 */
export type SystemKey = 'hiva' | 'magento' | 'crm';
export const SYSTEMS: SystemKey[] = ['hiva', 'magento', 'crm'];

export interface AttrLite {
  id: string;
  code: string;
  label: string;
  dataType: string;
  inputType: string;
  required: boolean;
  source: 'FREE' | 'OPTION' | 'MASTER';
  masterId?: string | null;
  options: { id: string; label: string }[];
}
export interface MasterValueLite {
  id: string;
  label: string;
  hiva: string;
  magento: string;
  crm: string;
}
export interface MasterLite {
  id: string;
  values: MasterValueLite[];
}

export interface ValueCell {
  shared?: any;
  hiva?: any;
  magento?: any;
  crm?: any;
}
export type ValuesMap = Record<string, ValueCell>;

function isEmpty(v: any): boolean {
  return v === undefined || v === null || v === '';
}

/** Human-readable shared value (resolves master ids to labels). */
export function sharedDisplay(
  attr: AttrLite,
  cell: ValueCell | undefined,
  masters: Record<string, MasterLite>,
): string {
  if (!cell) return '';
  if (attr.source === 'MASTER' && attr.masterId) {
    const m = masters[attr.masterId];
    const mv = m && m.values.find((v) => v.id === cell.shared);
    return mv ? mv.label : '';
  }
  return isEmpty(cell.shared) ? '' : String(cell.shared);
}

/** Resolve one attribute value for one target system: override-then-shared. */
export function resolveValue(
  attr: AttrLite,
  cell: ValueCell | undefined,
  system: SystemKey,
  masters: Record<string, MasterLite>,
): any {
  const c = cell || {};
  if (attr.source === 'MASTER' && attr.masterId) {
    const m = masters[attr.masterId];
    const mv = m && m.values.find((v) => v.id === c.shared);
    if (!mv) return '';
    return mv[system] || mv.label || '';
  }
  const override = c[system];
  if (!isEmpty(override)) return override;
  return isEmpty(c.shared) ? '' : c.shared;
}

/** Build the payload object that one target system would receive. */
export function buildPayload(
  attrs: AttrLite[],
  values: ValuesMap,
  system: SystemKey,
  masters: Record<string, MasterLite>,
): Record<string, any> {
  const out: Record<string, any> = {};
  for (const a of attrs) {
    const v = resolveValue(a, values[a.id], system, masters);
    if (!isEmpty(v)) out[a.code] = v;
  }
  return out;
}

export interface ValidationError {
  attributeId: string;
  code: string;
  message: string;
}

/** Validate the SHARED values against required / option / master rules. */
export function validateValues(
  attrs: AttrLite[],
  values: ValuesMap,
  masters: Record<string, MasterLite>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const a of attrs) {
    const cell = values[a.id] || {};
    const empty = isEmpty(cell.shared);
    if (a.required && empty) {
      errors.push({ attributeId: a.id, code: a.code, message: `${a.label} is required` });
      continue;
    }
    if (empty) continue;
    if (a.source === 'OPTION') {
      const ok = a.options.some((o) => o.label === cell.shared);
      if (!ok)
        errors.push({
          attributeId: a.id,
          code: a.code,
          message: `${a.label}: "${cell.shared}" is not an allowed option`,
        });
    }
    if (a.source === 'MASTER' && a.masterId) {
      const m = masters[a.masterId];
      const ok = !!(m && m.values.some((v) => v.id === cell.shared));
      if (!ok)
        errors.push({
          attributeId: a.id,
          code: a.code,
          message: `${a.label}: value not found in master`,
        });
    }
  }
  return errors;
}
