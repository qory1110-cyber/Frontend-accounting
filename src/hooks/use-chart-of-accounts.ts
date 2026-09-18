import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listChartOfAccounts,
  createChartOfAccount,
  updateChartOfAccount,
  setChartOfAccountActive,
} from '@/integrations/generated-clients/accounting-client'

export type AccountCategory = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'

const coaKeys = {
  list: (businessId: string) => ['businesses', businessId, 'chart-of-accounts'] as const,
  detail: (businessId: string, accountId: string) =>
    ['businesses', businessId, 'chart-of-accounts', accountId] as const,
}

export function useChartOfAccounts(businessId: string) {
  return useQuery({
    queryKey: coaKeys.list(businessId),
    queryFn: async () => {
      const res = await listChartOfAccounts({ path: { businessId }, query: {} })
      if (res.error) throw res.error
      return res.data!.data
    },
    enabled: !!businessId,
  })
}

interface AccountFormValues {
  code: string
  name: string
  category: AccountCategory
  currencyCode?: string
  isControlAccount?: boolean
}

export function useCreateChartOfAccount(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: AccountFormValues) => {
      const res = await createChartOfAccount({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coaKeys.list(businessId) }),
  })
}

export function useUpdateChartOfAccount(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ accountId, ...body }: Partial<AccountFormValues> & { accountId: string }) => {
      const res = await updateChartOfAccount({ path: { businessId, accountId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coaKeys.list(businessId) }),
  })
}

export function useSetChartOfAccountActive(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ accountId, isActive }: { accountId: string; isActive: boolean }) => {
      const res = await setChartOfAccountActive({ path: { businessId, accountId }, body: { isActive } })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coaKeys.list(businessId) }),
  })
}