import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listCreditNotes,
  createCreditNote,
  deleteCreditNote,
} from '@/integrations/generated-clients/accounting-client'

export const creditNoteKeys = {
  list: (businessId: string) => ['businesses', businessId, 'credit-notes'] as const,
}

export interface CreditNoteFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
}

export function useCreditNotes(
  businessId: string,
  page = 1,
  pageSize = 10,
  filters: CreditNoteFilters = {},
) {
  const { search, dateFrom, dateTo } = filters
  return useQuery({
    queryKey: [...creditNoteKeys.list(businessId), page, pageSize, search ?? '', dateFrom ?? '', dateTo ?? ''],
    queryFn: async () => {
      const res = await listCreditNotes({
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

interface CreditNoteLine {
  accountId: string
  qty: number
  unitPrice: number
}

interface CreditNoteFormValues {
  customerId: string
  issueDate: string
  reference?: string
  description?: string
  lines: CreditNoteLine[]
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, businessId: string) {
  queryClient.invalidateQueries({ queryKey: creditNoteKeys.list(businessId) })
  // Credit Note memposting jurnal: saldo akun di Chart of Accounts ikut berubah.
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'chart-of-accounts'] })
}

export function useCreateCreditNote(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreditNoteFormValues) => {
      const res = await createCreditNote({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useDeleteCreditNote(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (creditNoteId: string) => {
      const res = await deleteCreditNote({ path: { businessId, creditNoteId } })
      if (res.error) throw res.error
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}