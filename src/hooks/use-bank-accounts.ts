import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listBankAccounts,
  createBankAccount,
  updateBankAccount,
  setBankAccountActive,
  deleteBankAccount,
  listRecentBankAccounts,
  setBankAccountLockDate,
} from '@/integrations/generated-clients/accounting-client'

const bankAccountKeys = {
  list: (businessId: string) => ['businesses', businessId, 'bank-accounts'] as const,
}

export function useBankAccounts(businessId: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [...bankAccountKeys.list(businessId), page, pageSize],
    queryFn: async () => {
      const res = await listBankAccounts({ path: { businessId }, query: { page, pageSize } })
      if (res.error) throw res.error
      return { data: res.data!.data, pagination: res.data!.pagination }
    },
    enabled: !!businessId,
  })
}

interface BankAccountFormValues {
  name: string
  code?: string
  controlAccountId: string
  accountNumber?: string
  openingBalance?: number
  openingBalanceDate?: string
  canHavePendingTransactions?: boolean
  creditLimit?: number
}

export function useCreateBankAccount(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: BankAccountFormValues) => {
      const res = await createBankAccount({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.list(businessId) })
      queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'chart-of-accounts'] })
    },
  })
}

export function useUpdateBankAccount(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bankAccountId, ...body }: Partial<BankAccountFormValues> & { bankAccountId: string }) => {
      const res = await updateBankAccount({ path: { businessId, bankAccountId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bankAccountKeys.list(businessId) }),
  })
}

export function useSetBankAccountActive(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bankAccountId, isActive }: { bankAccountId: string; isActive: boolean }) => {
      const res = await setBankAccountActive({ path: { businessId, bankAccountId }, body: { isActive } })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bankAccountKeys.list(businessId) }),
  })
}

export function useSetBankAccountLockDate(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bankAccountId, lockDate }: { bankAccountId: string; lockDate: string | null }) => {
      const res = await setBankAccountLockDate({ path: { businessId, bankAccountId }, body: { lockDate } })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bankAccountKeys.list(businessId) }),
  })
}

export function useDeleteBankAccount(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (bankAccountId: string) => {
      const res = await deleteBankAccount({ path: { businessId, bankAccountId } })
      if (res.error) throw res.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.list(businessId) })
      queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'chart-of-accounts'] })
    },
  })
}

export function useRecentBankAccounts(businessId: string, limit = 20) {
  return useQuery({
    queryKey: [...bankAccountKeys.list(businessId), 'recent', limit],
    queryFn: async () => {
      const res = await listRecentBankAccounts({ path: { businessId }, query: { limit } })
      if (res.error) throw res.error
      return res.data!.data
    },
    enabled: !!businessId,
  })
}