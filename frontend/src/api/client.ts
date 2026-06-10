/* Thin fetch wrapper around the NestJS API (served under /api). */

const BASE = '/api';

/* The host application can set the acting user; until embedded it stays unset
   and the API records actions as "system". */
function actorHeader(): Record<string, string> {
  const a = (typeof window !== 'undefined' && (window as any).__PRODUCT_TOOL_ACTOR__) || '';
  return a ? { 'X-Actor': String(a) } : {};
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...actorHeader(), ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.message) msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ---------------- types (mirror the API response shapes) -------------- */
export type Source = 'FREE' | 'OPTION' | 'MASTER';
export type SystemKey = 'hiva' | 'magento' | 'crm';

export interface Attribute {
  id: string;
  code: string;
  label: string;
  dataType: string;
  inputType: string;
  required: boolean;
  system: boolean;
  source: Source;
  unit: string;
  masterId: string | null;
  options: { id: string; label: string }[];
}

export interface MasterValue {
  id: string;
  label: string;
  hiva: string;
  magento: string;
  crm: string;
  sortOrder?: number;
}
export interface Master {
  id: string;
  name: string;
  key: string;
  values: MasterValue[];
}

export interface AttrGroup {
  id: string;
  name: string;
  attributeIds: string[];
}
export interface AttributeSet {
  id: string;
  name: string;
  system: boolean;
  familyValues: string[];
  groups: AttrGroup[];
}

export interface ValueCell {
  shared?: any;
  hiva?: any;
  magento?: any;
  crm?: any;
}
export type ValuesMap = Record<string, ValueCell>;

export interface ValidationError {
  attributeId: string;
  code: string;
  message: string;
}
export interface AuditEntry {
  id: string;
  productId: string;
  version: number;
  action: string;
  actor: string;
  note?: string | null;
  summary: { code: string; name: string; brand: string };
  at: string;
}

export interface ProductRevision {
  id: string;
  version: number;
  action: string;
  actor: string;
  note?: string | null;
  summary: { code: string; name: string; brand: string };
  values: ValuesMap;
  at: string;
}

export interface Product {
  id: string;
  setId: string;
  setName: string;
  version: number;
  values: ValuesMap;
  summary: { code: string; name: string; brand: string };
  deliveries: Record<string, string>;
  resolved: Record<SystemKey, Record<string, any>>;
  validation: ValidationError[];
}

/* ----------------------------- endpoints ------------------------------ */
export const api = {
  // attributes
  listAttributes: () => req<Attribute[]>('/attributes'),
  createAttribute: (dto: any) => req<Attribute>('/attributes', { method: 'POST', body: JSON.stringify(dto) }),
  updateAttribute: (id: string, dto: any) => req<Attribute>(`/attributes/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deleteAttribute: (id: string) => req<void>(`/attributes/${id}`, { method: 'DELETE' }),

  // masters
  listMasters: () => req<Master[]>('/masters'),
  createMaster: (dto: any) => req<Master>('/masters', { method: 'POST', body: JSON.stringify(dto) }),
  updateMaster: (id: string, dto: any) => req<Master>(`/masters/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),

  // sets
  listSets: () => req<AttributeSet[]>('/sets'),
  createSet: (dto: any) => req<AttributeSet>('/sets', { method: 'POST', body: JSON.stringify(dto) }),
  updateSet: (id: string, dto: any) => req<AttributeSet>(`/sets/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deleteSet: (id: string) => req<void>(`/sets/${id}`, { method: 'DELETE' }),

  // products
  listProducts: () => req<Product[]>('/products'),
  getProduct: (id: string) => req<Product>(`/products/${id}`),
  createProduct: (dto: any) => req<Product>('/products', { method: 'POST', body: JSON.stringify(dto) }),
  updateProduct: (id: string, dto: any) => req<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deleteProduct: (id: string) => req<void>(`/products/${id}`, { method: 'DELETE' }),
  publishProduct: (id: string) => req<any>(`/products/${id}/publish`, { method: 'POST', body: '{}' }),
  productHistory: (id: string) => req<ProductRevision[]>(`/products/${id}/history`),
  auditFeed: () => req<AuditEntry[]>('/products/audit'),
  revertProduct: (id: string, revisionId: string) => req<Product>(`/products/${id}/revert/${revisionId}`, { method: 'POST', body: '{}' }),
  restoreProduct: (id: string) => req<Product>(`/products/${id}/restore`, { method: 'POST', body: '{}' }),
  listDeletedProducts: () => req<Product[]>('/products/deleted'),

  importProducts: (setId: string, csv: string) =>
    req<{ created: number; errors: any[]; matched: string[]; ignored: string[]; addedMasterValues: string[]; usedSetColumn: boolean }>('/import/products', { method: 'POST', body: JSON.stringify({ setId, csv }) }),

  exportCsvUrl: () => `${BASE}/export/products.csv`,
};
