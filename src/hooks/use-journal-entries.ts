import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listJournalEntries,
  createJournalEntry,
  deleteJournalEntry,
} from '@/integrations/generated-clients/accounting-client'

const journalEntryKeys = {
  list: (businessId: string) => ['businesses', businessId, 'journal-entries'] as const,
}

export function useJournalEntries(businessId: string, page = 1, pageSize = 10, search = '') {
  const trimmed = search.trim()
  return useQuery({
    queryKey: [...journalEntryKeys.list(businessId), page, pageSize, trimmed],
    queryFn: async () => {
      const res = await listJournalEntries({
        path: { businessId },
        query: { page, pageSize, search: trimmed || undefined },
      })
      if (res.error) throw res.error
      return { data: res.data!.data, pagination: res.data!.pagination }
    },
    enabled: !!businessId,
  })
}

interface JournalLineInput {
  accountId: string
  debit: number
  credit: number
  description?: string
}

interface JournalEntryFormValues {
  entryDate: string
  reference?: string
  description?: string
  lines: JournalLineInput[]
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, businessId: string) {
  queryClient.invalidateQueries({ queryKey: journalEntryKeys.list(businessId) })
  // Jurnal yang menyentuh akun kontrol bank mengubah saldo bank dan saldo akun.
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'bank-accounts'] })
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'chart-of-accounts'] })
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'bank-reconciliations'] })
}

export function useCreateJournalEntry(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: JournalEntryFormValues) => {
      const res = await createJournalEntry({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useDeleteJournalEntry(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (journalEntryId: string) => {
      const res = await deleteJournalEntry({ path: { businessId, journalEntryId } })
      if (res.error) throw res.error
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}