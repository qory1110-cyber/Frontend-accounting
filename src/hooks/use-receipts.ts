import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listReceipts, createReceipt, deleteReceipt, getReceiptTotals, setReceiptCleared } from '@/integrations/generated-clients/accounting-client'

const receiptKeys = {
  list: (businessId: string) => ['businesses', businessId, 'receipts'] as const,
}

export function useReceipts(businessId: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [...receiptKeys.list(businessId), page, pageSize],
    queryFn: async () => {
      const res = await listReceipts({ path: { businessId }, query: { page, pageSize } })
      if (res.error) throw res.error
      return { data: res.data!.data, pagination: res.data!.pagination }
    },
    enabled: !!businessId,
  })
}

interface ReceiptLineInput {
  amount: number
  salesInvoiceId?: string
  accountId?: string
}

interface ReceiptFormValues {
  receiptDate: string
  reference?: string
  receivedInBankAccountId: string
  paidByContactId?: string
  description?: string
  lines: ReceiptLineInput[]
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, businessId: string) {
  queryClient.invalidateQueries({ queryKey: receiptKeys.list(businessId) })
  // Receipt bisa melunasi faktur dan selalu menyentuh saldo bank - ikut refresh.
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'sales-invoices'] })
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'bank-accounts'] })
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'chart-of-accounts'] })
}

export function useCreateReceipt(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: ReceiptFormValues) => {
      const res = await createReceipt({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useDeleteReceipt(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (receiptId: string) => {
      const res = await deleteReceipt({ path: { businessId, receiptId } })
      if (res.error) throw res.error
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useReceiptTotals(businessId: string) {
  return useQuery({
    queryKey: [...receiptKeys.list(businessId), 'totals'],
    queryFn: async () => {
      const res = await getReceiptTotals({ path: { businessId } })
      if (res.error) throw res.error
      return res.data!.data
    },
    enabled: !!businessId,
  })
}

export function useSetReceiptCleared(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ receiptId, cleared }: { receiptId: string; cleared: boolean }) => {
      const res = await setReceiptCleared({ path: { businessId, receiptId }, body: { cleared } })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}