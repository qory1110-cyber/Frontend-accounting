import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listPurchaseQuotes,
  createPurchaseQuote,
  updatePurchaseQuote,
  deletePurchaseQuote,
} from '@/integrations/generated-clients/accounting-client'

export const purchaseQuoteKeys = {
  list: (businessId: string) => ['businesses', businessId, 'purchase-quotes'] as const,
}

export type PurchaseQuoteStatus = 'active' | 'cancelled'

export interface PurchaseQuoteFilters {
  search?: string
  status?: PurchaseQuoteStatus | ''
  supplierId?: string
  dateFrom?: string
  dateTo?: string
}

export function usePurchaseQuotes(
  businessId: string,
  page = 1,
  pageSize = 10,
  filters: PurchaseQuoteFilters = {},
) {
  const { search, status, supplierId, dateFrom, dateTo } = filters
  return useQuery({
    queryKey: [
      ...purchaseQuoteKeys.list(businessId),
      page,
      pageSize,
      search ?? '',
      status ?? '',
      supplierId ?? '',
      dateFrom ?? '',
      dateTo ?? '',
    ],
    queryFn: async () => {
      const res = await listPurchaseQuotes({
        path: { businessId },
        query: {
          page,
          pageSize,
          search: search || undefined,
          status: status || undefined,
          supplierId: supplierId || undefined,
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

export interface PurchaseQuoteLineValues {
  description: string
  qty: number
  unitPrice: number
}

interface PurchaseQuoteCreateValues {
  supplierId: string
  issueDate: string
  reference?: string
  description?: string
  lines: PurchaseQuoteLineValues[]
}

// Update: reference & description boleh null supaya bisa dikosongkan.
// status hanya 'cancelled' (membatalkan penawaran).
interface PurchaseQuoteUpdateValues {
  supplierId?: string
  issueDate?: string
  reference?: string | null
  description?: string | null
  lines?: PurchaseQuoteLineValues[]
  status?: 'cancelled'
}

export function useCreatePurchaseQuote(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: PurchaseQuoteCreateValues) => {
      const res = await createPurchaseQuote({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseQuoteKeys.list(businessId) }),
  })
}

export function useUpdatePurchaseQuote(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      purchaseQuoteId,
      ...body
    }: PurchaseQuoteUpdateValues & { purchaseQuoteId: string }) => {
      const res = await updatePurchaseQuote({ path: { businessId, purchaseQuoteId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseQuoteKeys.list(businessId) }),
  })
}

export function useDeletePurchaseQuote(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (purchaseQuoteId: string) => {
      const res = await deletePurchaseQuote({ path: { businessId, purchaseQuoteId } })
      if (res.error) throw res.error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseQuoteKeys.list(businessId) }),
  })
}