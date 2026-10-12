import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listInterAccountTransfers,
  createInterAccountTransfer,
  setInterAccountTransferCleared,
  deleteInterAccountTransfer,
} from '@/integrations/generated-clients/accounting-client'

const transferKeys = {
  list: (businessId: string) => ['businesses', businessId, 'inter-account-transfers'] as const,
}

export function useInterAccountTransfers(businessId: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [...transferKeys.list(businessId), page, pageSize],
    queryFn: async () => {
      const res = await listInterAccountTransfers({ path: { businessId }, query: { page, pageSize } })
      if (res.error) throw res.error
      return { data: res.data!.data, pagination: res.data!.pagination }
    },
    enabled: !!businessId,
  })
}

interface TransferFormValues {
  transferDate: string
  reference?: string
  description?: string
  paidFromBankAccountId: string
  receivedInBankAccountId: string
  amount: number
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, businessId: string) {
  queryClient.invalidateQueries({ queryKey: transferKeys.list(businessId) })
  // Transfer menyentuh saldo dua akun bank dan Pending Withdrawals akun asal.
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'bank-accounts'] })
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'chart-of-accounts'] })
}

export function useCreateInterAccountTransfer(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: TransferFormValues) => {
      const res = await createInterAccountTransfer({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useSetTransferCleared(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      transferId,
      ...body
    }: {
      transferId: string
      paidFromCleared?: boolean
      receivedInCleared?: boolean
    }) => {
      const res = await setInterAccountTransferCleared({ path: { businessId, transferId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useDeleteInterAccountTransfer(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (transferId: string) => {
      const res = await deleteInterAccountTransfer({ path: { businessId, transferId } })
      if (res.error) throw res.error
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}