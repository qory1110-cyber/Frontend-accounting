import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
} from '@/integrations/generated-clients/accounting-client'

export const purchaseOrderKeys = {
  list: (businessId: string) => ['businesses', businessId, 'purchase-orders'] as const,
}

export interface PurchaseOrderFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
}

export function usePurchaseOrders(
  businessId: string,
  page = 1,
  pageSize = 10,
  filters: PurchaseOrderFilters = {},
) {
  const { search, dateFrom, dateTo } = filters
  return useQuery({
    queryKey: [...purchaseOrderKeys.list(businessId), page, pageSize, search ?? '', dateFrom ?? '', dateTo ?? ''],
    queryFn: async () => {
      const res = await listPurchaseOrders({
        path: { businessId },
        query: {
          page,
          pageSize,
          search: search || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      })
      if (res.error) throw res.error
      return { data: res.data!.data, pagination: res.data!.pagination }
    },
    enabled: !!businessId,
  })
}

interface PurchaseOrderLine {
  accountId: string
  description?: string
  qty: number
  unitPrice: number
}

interface PurchaseOrderFormValues {
  supplierId: string
  orderDate: string
  reference?: string
  billingAddress?: string
  description?: string
  lines: PurchaseOrderLine[]
}

export function useCreatePurchaseOrder(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: PurchaseOrderFormValues) => {
      const res = await createPurchaseOrder({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.list(businessId) }),
  })
}

export function useUpdatePurchaseOrder(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      purchaseOrderId,
      ...body
    }: Partial<PurchaseOrderFormValues> & { purchaseOrderId: string }) => {
      const res = await updatePurchaseOrder({ path: { businessId, purchaseOrderId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.list(businessId) }),
  })
}

export function useDeletePurchaseOrder(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (purchaseOrderId: string) => {
      const res = await deletePurchaseOrder({ path: { businessId, purchaseOrderId } })
      if (res.error) throw res.error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.list(businessId) }),
  })
}