import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

/* ------------------------------ queries ------------------------------ */
export const useAttributes = () => useQuery({ queryKey: ['attributes'], queryFn: api.listAttributes });
export const useMasters = () => useQuery({ queryKey: ['masters'], queryFn: api.listMasters });
export const useSets = () => useQuery({ queryKey: ['sets'], queryFn: api.listSets });
export const useProducts = () => useQuery({ queryKey: ['products'], queryFn: api.listProducts });
export const useDeletedProducts = (enabled = true) => useQuery({ queryKey: ['products-deleted'], queryFn: api.listDeletedProducts, enabled });
export const useProductHistory = (id: string | null) =>
  useQuery({ queryKey: ['product-history', id], queryFn: () => api.productHistory(id as string), enabled: !!id });
export const useAuditFeed = () => useQuery({ queryKey: ['audit'], queryFn: api.auditFeed });

/* --------------------------- mutations -------------------------------- */
function useInvalidate(keys: string[]) {
  const qc = useQueryClient();
  return () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useAttributeMutations() {
  const refetch = useInvalidate(['attributes', 'sets', 'products']);
  return {
    create: useMutation({ mutationFn: api.createAttribute, onSuccess: refetch }),
    update: useMutation({ mutationFn: (v: { id: string; dto: any }) => api.updateAttribute(v.id, v.dto), onSuccess: refetch }),
    remove: useMutation({ mutationFn: api.deleteAttribute, onSuccess: refetch }),
  };
}

export function useMasterMutations() {
  const refetch = useInvalidate(['masters', 'products']);
  return {
    create: useMutation({ mutationFn: api.createMaster, onSuccess: refetch }),
    update: useMutation({ mutationFn: (v: { id: string; dto: any }) => api.updateMaster(v.id, v.dto), onSuccess: refetch }),
  };
}

export function useSetMutations() {
  const refetch = useInvalidate(['sets', 'products']);
  return {
    create: useMutation({ mutationFn: api.createSet, onSuccess: refetch }),
    update: useMutation({ mutationFn: (v: { id: string; dto: any }) => api.updateSet(v.id, v.dto), onSuccess: refetch }),
    remove: useMutation({ mutationFn: api.deleteSet, onSuccess: refetch }),
  };
}

export function useProductMutations() {
  const qc = useQueryClient();
  const refetchAll = () => ['products', 'masters', 'attributes'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const afterChange = () => {
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['products-deleted'] });
    qc.invalidateQueries({ queryKey: ['product-history'] });
    qc.invalidateQueries({ queryKey: ['audit'] });
  };
  return {
    create: useMutation({ mutationFn: api.createProduct, onSuccess: () => afterChange() }),
    update: useMutation({ mutationFn: (v: { id: string; dto: any }) => api.updateProduct(v.id, v.dto), onSuccess: () => afterChange() }),
    remove: useMutation({ mutationFn: api.deleteProduct, onSuccess: () => afterChange() }),
    publish: useMutation({ mutationFn: api.publishProduct, onSuccess: () => afterChange() }),
    revert: useMutation({ mutationFn: (v: { id: string; revisionId: string }) => api.revertProduct(v.id, v.revisionId), onSuccess: () => afterChange() }),
    restore: useMutation({ mutationFn: api.restoreProduct, onSuccess: () => afterChange() }),
    importCsv: useMutation({ mutationFn: (v: { setId: string; csv: string }) => api.importProducts(v.setId, v.csv), onSuccess: refetchAll }),
  };
}
