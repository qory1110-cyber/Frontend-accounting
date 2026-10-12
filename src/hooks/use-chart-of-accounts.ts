import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listChartOfAccounts,
  createChartOfAccount,
  updateChartOfAccount,
  setChartOfAccountActive,
  deleteChartOfAccount, // <- tambahkan
  listRecentChartOfAccounts,
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
      // Sementara minta pageSize besar supaya tidak ada akun yang tersembunyi
      // tanpa sengaja - pagination penuh (tombol halaman, dsb) untuk Chart of
      // Accounts belum dipasang, ditunda sesuai rencana awal.
      const res = await listChartOfAccounts({ path: { businessId }, query: { page: 1, pageSize: 100 } })
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

export function useDeleteChartOfAccount(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (accountId: string) => {
      const res = await deleteChartOfAccount({ path: { businessId, accountId } })
      if (res.error) throw res.error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coaKeys.list(businessId) }),
  })
}

export function useRecentChartOfAccounts(businessId: string, category?: AccountCategory, limit = 20) {
  return useQuery({
    queryKey: [...coaKeys.list(businessId), 'recent', category ?? 'all', limit],
    queryFn: async () => {
      const res = await listRecentChartOfAccounts({ path: { businessId }, query: { limit, category } })
      if (res.error) throw res.error
      return res.data!.data
    },
    enabled: !!businessId,
  })
}

// Khusus halaman daftar Chart of Accounts: berpagination, mengembalikan { data, pagination }.
// Kuncinya beda dari useChartOfAccounts (yang mengembalikan array) supaya cache tidak bentrok.
export function useChartOfAccountsPage(businessId: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...coaKeys.list(businessId), 'page', page, pageSize],
    queryFn: async () => {
      const res = await listChartOfAccounts({ path: { businessId }, query: { page, pageSize } })
      if (res.error) throw res.error
      return { data: res.data!.data, pagination: res.data!.pagination }
    },
    enabled: !!businessId,
  })
}