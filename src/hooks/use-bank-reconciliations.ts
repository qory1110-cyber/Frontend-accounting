import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listBankReconciliations,
  getBankReconciliation,
  createBankReconciliation,
  updateBankReconciliation,
  deleteBankReconciliation,
} from '@/integrations/generated-clients/accounting-client'

const reconciliationKeys = {
  list: (businessId: string) => ['businesses', businessId, 'bank-reconciliations'] as const,
}

export function useBankReconciliations(businessId: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [...reconciliationKeys.list(businessId), page, pageSize],
    queryFn: async () => {
      const res = await listBankReconciliations({ path: { businessId }, query: { page, pageSize } })
      if (res.error) throw res.error
      return { data: res.data!.data, pagination: res.data!.pagination }
    },
    enabled: !!businessId,
  })
}

// Detail (termasuk daftar transaksi uncleared) - dipakai dialog View.
export function useBankReconciliation(businessId: string, reconciliationId: string | null) {
  return useQuery({
    queryKey: [...reconciliationKeys.list(businessId), 'detail', reconciliationId],
    queryFn: async () => {
      const res = await getBankReconciliation({ path: { businessId, reconciliationId: reconciliationId! } })
      if (res.error) throw res.error
      return res.data!.data
    },
    enabled: !!businessId && !!reconciliationId,
  })
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, businessId: string) {
  queryClient.invalidateQueries({ queryKey: reconciliationKeys.list(businessId) })
  // lastReconciliationDate di Bank and Cash Accounts ikut berubah.
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'bank-accounts'] })
}

export function useCreateBankReconciliation(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { bankAccountId: string; reconciliationDate: string; statementBalance: number }) => {
      const res = await createBankReconciliation({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useUpdateBankReconciliation(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      reconciliationId,
      body,
    }: {
      reconciliationId: string
      body: { reconciliationDate?: string; statementBalance?: number }
    }) => {
      const res = await updateBankReconciliation({ path: { businessId, reconciliationId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useDeleteBankReconciliation(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (reconciliationId: string) => {
      const res = await deleteBankReconciliation({ path: { businessId, reconciliationId } })
      if (res.error) throw res.error
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}