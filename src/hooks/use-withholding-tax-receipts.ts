import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listWithholdingTaxReceipts,
  createWithholdingTaxReceipt,
  updateWithholdingTaxReceipt,
  deleteWithholdingTaxReceipt,
} from '@/integrations/generated-clients/accounting-client'

export const withholdingTaxReceiptKeys = {
  list: (businessId: string) => ['businesses', businessId, 'withholding-tax-receipts'] as const,
}

export interface WithholdingTaxReceiptFilters {
  search?: string
  customerId?: string
  dateFrom?: string
  dateTo?: string
}

export function useWithholdingTaxReceipts(
  businessId: string,
  page = 1,
  pageSize = 10,
  filters: WithholdingTaxReceiptFilters = {},
) {
  const { search, customerId, dateFrom, dateTo } = filters
  return useQuery({
    queryKey: [
      ...withholdingTaxReceiptKeys.list(businessId),
      page,
      pageSize,
      search ?? '',
      customerId ?? '',
      dateFrom ?? '',
      dateTo ?? '',
    ],
    queryFn: async () => {
      const res = await listWithholdingTaxReceipts({
        path: { businessId },
        query: {
          page,
          pageSize,
          search: search || undefined,
          customerId: customerId || undefined,
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

interface WithholdingTaxReceiptCreateValues {
  customerId: string
  receiptDate: string
  amount: number
  description?: string
}

// Update: description boleh null supaya bisa dikosongkan.
interface WithholdingTaxReceiptUpdateValues {
  customerId?: string
  receiptDate?: string
  amount?: number
  description?: string | null
}

export function useCreateWithholdingTaxReceipt(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: WithholdingTaxReceiptCreateValues) => {
      const res = await createWithholdingTaxReceipt({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: withholdingTaxReceiptKeys.list(businessId) }),
  })
}

export function useUpdateWithholdingTaxReceipt(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      withholdingTaxReceiptId,
      ...body
    }: WithholdingTaxReceiptUpdateValues & { withholdingTaxReceiptId: string }) => {
      const res = await updateWithholdingTaxReceipt({ path: { businessId, withholdingTaxReceiptId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: withholdingTaxReceiptKeys.list(businessId) }),
  })
}

export function useDeleteWithholdingTaxReceipt(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (withholdingTaxReceiptId: string) => {
      const res = await deleteWithholdingTaxReceipt({ path: { businessId, withholdingTaxReceiptId } })
      if (res.error) throw res.error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: withholdingTaxReceiptKeys.list(businessId) }),
  })
}