import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  setSupplierActive,
  deleteSupplier,
  listRecentSuppliers,
} from '@/integrations/generated-clients/accounting-client'

const supplierKeys = {
  list: (businessId: string) => ['businesses', businessId, 'suppliers'] as const,
}

export function useSuppliers(businessId: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [...supplierKeys.list(businessId), page, pageSize],
    queryFn: async () => {
      const res = await listSuppliers({ path: { businessId }, query: { page, pageSize } })
      if (res.error) throw res.error
      return { data: res.data!.data, pagination: res.data!.pagination }
    },
    enabled: !!businessId,
  })
}

interface SupplierFormValues {
  name: string
  code?: string
  creditLimit?: number
  address?: string
  email?: string
}

export function useCreateSupplier(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: SupplierFormValues) => {
      const res = await createSupplier({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierKeys.list(businessId) }),
  })
}

export function useUpdateSupplier(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ supplierId, ...body }: Partial<SupplierFormValues> & { supplierId: string }) => {
      const res = await updateSupplier({ path: { businessId, supplierId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierKeys.list(businessId) }),
  })
}

export function useSetSupplierActive(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ supplierId, isActive }: { supplierId: string; isActive: boolean }) => {
      const res = await setSupplierActive({ path: { businessId, supplierId }, body: { isActive } })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierKeys.list(businessId) }),
  })
}

export function useDeleteSupplier(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (supplierId: string) => {
      const res = await deleteSupplier({ path: { businessId, supplierId } })
      if (res.error) throw res.error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierKeys.list(businessId) }),
  })
}

export function useRecentSuppliers(businessId: string, limit = 20) {
  return useQuery({
    queryKey: [...supplierKeys.list(businessId), 'recent', limit],
    queryFn: async () => {
      const res = await listRecentSuppliers({ path: { businessId }, query: { limit } })
      if (res.error) throw res.error
      return res.data!.data
    },
    enabled: !!businessId,
  })
}