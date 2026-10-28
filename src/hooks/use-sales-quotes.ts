import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listSalesQuotes,
  createSalesQuote,
  updateSalesQuote,
  deleteSalesQuote,
} from '@/integrations/generated-clients/accounting-client'

export const salesQuoteKeys = {
  list: (businessId: string) => ['businesses', businessId, 'sales-quotes'] as const,
}

export interface SalesQuoteFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
}

export function useSalesQuotes(
  businessId: string,
  page = 1,
  pageSize = 10,
  filters: SalesQuoteFilters = {},
) {
  const { search, dateFrom, dateTo } = filters
  return useQuery({
    queryKey: [...salesQuoteKeys.list(businessId), page, pageSize, search ?? '', dateFrom ?? '', dateTo ?? ''],
    queryFn: async () => {
      const res = await listSalesQuotes({
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

interface SalesQuoteLine {
  description: string
  qty: number
  unitPrice: number
}

interface SalesQuoteCreateValues {
  customerId: string
  issueDate: string
  validDays?: number
  reference?: string
  billingAddress?: string
  description?: string
  lines: SalesQuoteLine[]
}

// Update: field opsional boleh null supaya bisa dikosongkan.
interface SalesQuoteUpdateValues {
  customerId?: string
  issueDate?: string
  validDays?: number | null
  reference?: string | null
  billingAddress?: string | null
  description?: string | null
  lines?: SalesQuoteLine[]
}

export function useCreateSalesQuote(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: SalesQuoteCreateValues) => {
      const res = await createSalesQuote({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesQuoteKeys.list(businessId) }),
  })
}

export function useUpdateSalesQuote(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      salesQuoteId,
      ...body
    }: SalesQuoteUpdateValues & { salesQuoteId: string }) => {
      const res = await updateSalesQuote({ path: { businessId, salesQuoteId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesQuoteKeys.list(businessId) }),
  })
}

export function useDeleteSalesQuote(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (salesQuoteId: string) => {
      const res = await deleteSalesQuote({ path: { businessId, salesQuoteId } })
      if (res.error) throw res.error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesQuoteKeys.list(businessId) }),
  })
}