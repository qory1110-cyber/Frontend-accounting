import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listPayments,
  createPayment,
  deletePayment,
  setPaymentCleared,
  getPaymentTotals,
} from '@/integrations/generated-clients/accounting-client'

const paymentKeys = {
  list: (businessId: string) => ['businesses', businessId, 'payments'] as const,
}

export function usePayments(businessId: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [...paymentKeys.list(businessId), page, pageSize],
    queryFn: async () => {
      const res = await listPayments({ path: { businessId }, query: { page, pageSize } })
      if (res.error) throw res.error
      return { data: res.data!.data, pagination: res.data!.pagination }
    },
    enabled: !!businessId,
  })
}

export function usePaymentTotals(businessId: string) {
  return useQuery({
    queryKey: [...paymentKeys.list(businessId), 'totals'],
    queryFn: async () => {
      const res = await getPaymentTotals({ path: { businessId } })
      if (res.error) throw res.error
      return res.data!.data
    },
    enabled: !!businessId,
  })
}

interface PaymentLineInput {
  projectId?: string
  amount: number
  purchaseInvoiceId?: string
  expenseClaimId?: string
  accountId?: string
}

interface PaymentFormValues {
  paymentDate: string
  reference?: string
  paidFromBankAccountId: string
  payeeContactId: string
  description?: string
  lines: PaymentLineInput[]
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, businessId: string) {
  queryClient.invalidateQueries({ queryKey: paymentKeys.list(businessId) })
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'purchase-invoices'] })
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'expense-claims'] })
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'bank-accounts'] })
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'chart-of-accounts'] })
  // Payment langsung ke akun Beban mengubah total laba-rugi proyek.
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'projects'] })
}

export function useCreatePayment(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: PaymentFormValues) => {
      const res = await createPayment({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useSetPaymentCleared(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ paymentId, cleared }: { paymentId: string; cleared: boolean }) => {
      const res = await setPaymentCleared({ path: { businessId, paymentId }, body: { cleared } })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useDeletePayment(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await deletePayment({ path: { businessId, paymentId } })
      if (res.error) throw res.error
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}