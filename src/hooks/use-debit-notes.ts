import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listDebitNotes,
  createDebitNote,
  deleteDebitNote,
} from '@/integrations/generated-clients/accounting-client'

export const debitNoteKeys = {
  list: (businessId: string) => ['businesses', businessId, 'debit-notes'] as const,
}

export interface DebitNoteFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
}

export function useDebitNotes(
  businessId: string,
  page = 1,
  pageSize = 10,
  filters: DebitNoteFilters = {},
) {
  const { search, dateFrom, dateTo } = filters
  return useQuery({
    queryKey: [...debitNoteKeys.list(businessId), page, pageSize, search ?? '', dateFrom ?? '', dateTo ?? ''],
    queryFn: async () => {
      const res = await listDebitNotes({
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

interface DebitNoteLine {
  accountId: string
  qty: number
  unitPrice: number
}

interface DebitNoteFormValues {
  supplierId: string
  purchaseInvoiceId?: string
  issueDate: string
  reference?: string
  description?: string
  lines: DebitNoteLine[]
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, businessId: string) {
  queryClient.invalidateQueries({ queryKey: debitNoteKeys.list(businessId) })
  // Debit Note memposting jurnal: saldo akun di Chart of Accounts ikut berubah.
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'chart-of-accounts'] })
  // Debit Note yang dikaitkan ke faktur mengubah Balance due faktur pembelian.
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'purchase-invoices'] })
}

export function useCreateDebitNote(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: DebitNoteFormValues) => {
      const res = await createDebitNote({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useDeleteDebitNote(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (debitNoteId: string) => {
      const res = await deleteDebitNote({ path: { businessId, debitNoteId } })
      if (res.error) throw res.error
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}