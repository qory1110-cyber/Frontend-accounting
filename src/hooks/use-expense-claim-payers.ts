import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listExpenseClaimPayers,
  createExpenseClaimPayer,
  updateExpenseClaimPayer,
  setExpenseClaimPayerActive,
  deleteExpenseClaimPayer,
} from '@/integrations/generated-clients/accounting-client'
import { expenseClaimKeys } from '@/hooks/use-expense-claims'

export const expenseClaimPayerKeys = {
  list: (businessId: string) => ['businesses', businessId, 'expense-claim-payers'] as const,
}

export function useExpenseClaimPayers(businessId: string) {
  return useQuery({
    queryKey: expenseClaimPayerKeys.list(businessId),
    queryFn: async () => {
      const res = await listExpenseClaimPayers({ path: { businessId } })
      if (res.error) throw res.error
      return res.data!.data
    },
    enabled: !!businessId,
  })
}

// Ganti nama Payer mengubah payerName di daftar klaim, jadi keduanya disegarkan.
function useInvalidatePayers(businessId: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: expenseClaimPayerKeys.list(businessId) }),
      queryClient.invalidateQueries({ queryKey: expenseClaimKeys.list(businessId) }),
    ])
}

export function useCreateExpenseClaimPayer(businessId: string) {
  const invalidate = useInvalidatePayers(businessId)
  return useMutation({
    mutationFn: async (body: { name: string }) => {
      const res = await createExpenseClaimPayer({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: invalidate,
  })
}

export function useUpdateExpenseClaimPayer(businessId: string) {
  const invalidate = useInvalidatePayers(businessId)
  return useMutation({
    mutationFn: async ({ payerId, name }: { payerId: string; name: string }) => {
      const res = await updateExpenseClaimPayer({ path: { businessId, payerId }, body: { name } })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: invalidate,
  })
}

export function useSetExpenseClaimPayerActive(businessId: string) {
  const invalidate = useInvalidatePayers(businessId)
  return useMutation({
    mutationFn: async ({ payerId, isActive }: { payerId: string; isActive: boolean }) => {
      const res = await setExpenseClaimPayerActive({ path: { businessId, payerId }, body: { isActive } })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: invalidate,
  })
}

export function useDeleteExpenseClaimPayer(businessId: string) {
  const invalidate = useInvalidatePayers(businessId)
  return useMutation({
    mutationFn: async (payerId: string) => {
      const res = await deleteExpenseClaimPayer({ path: { businessId, payerId } })
      if (res.error) throw res.error
    },
    onSuccess: invalidate,
  })
}