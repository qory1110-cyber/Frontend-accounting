import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listSalesOrders,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
} from '@/integrations/generated-clients/accounting-client'

export const salesOrderKeys = {
  list: (businessId: string) => ['businesses', businessId, 'sales-orders'] as const,
}

export interface SalesOrderFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
}

export function useSalesOrders(
  businessId: string,
  page = 1,
  pageSize = 10,
  filters: SalesOrderFilters = {},
) {
  const { search, dateFrom, dateTo } = filters
  return useQuery({
    queryKey: [...salesOrderKeys.list(businessId), page, pageSize, search ?? '', dateFrom ?? '', dateTo ?? ''],
    queryFn: async () => {
      const res = await listSalesOrders({
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

interface SalesOrderLine {
  description: string
  qty: number
  unitPrice: number
}

interface SalesOrderCreateValues {
  customerId: string
  issueDate: string
  reference?: string
  description?: string
  lines: SalesOrderLine[]
}

// Update: field opsional boleh null supaya bisa dikosongkan.
interface SalesOrderUpdateValues {
  customerId?: string
  issueDate?: string
  reference?: string | null
  description?: string | null
  lines?: SalesOrderLine[]
}

export function useCreateSalesOrder(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: SalesOrderCreateValues) => {
      const res = await createSalesOrder({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesOrderKeys.list(businessId) }),
  })
}

export function useUpdateSalesOrder(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      salesOrderId,
      ...body
    }: SalesOrderUpdateValues & { salesOrderId: string }) => {
      const res = await updateSalesOrder({ path: { businessId, salesOrderId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesOrderKeys.list(businessId) }),
  })
}

export function useDeleteSalesOrder(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (salesOrderId: string) => {
      const res = await deleteSalesOrder({ path: { businessId, salesOrderId } })
      if (res.error) throw res.error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesOrderKeys.list(businessId) }),
  })
}