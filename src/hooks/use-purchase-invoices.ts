import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listPurchaseInvoices,
  createPurchaseInvoice,
  updatePurchaseInvoice,
  deletePurchaseInvoice,
  approvePurchaseInvoice,
  voidPurchaseInvoice,
  getPurchaseInvoiceTotals,
} from '@/integrations/generated-clients/accounting-client'

const purchaseInvoiceKeys = {
  list: (businessId: string) => ['businesses', businessId, 'purchase-invoices'] as const,
}

export function usePurchaseInvoices(businessId: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [...purchaseInvoiceKeys.list(businessId), page, pageSize],
    queryFn: async () => {
      const res = await listPurchaseInvoices({ path: { businessId }, query: { page, pageSize } })
      if (res.error) throw res.error
      return { data: res.data!.data, pagination: res.data!.pagination }
    },
    enabled: !!businessId,
  })
}

interface PurchaseInvoiceLine {
  accountId: string
  qty: number
  unitPrice: number
}

interface PurchaseInvoiceFormValues {
  supplierId: string
  issueDate: string
  dueDate?: string
  reference?: string
  description?: string
  lines: PurchaseInvoiceLine[]
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, businessId: string) {
  queryClient.invalidateQueries({ queryKey: purchaseInvoiceKeys.list(businessId) })
  // Approve/Void memposting jurnal yang menyentuh akun COA & saldo bank - ikut refresh.
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'chart-of-accounts'] })
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'bank-accounts'] })
}

export function useCreatePurchaseInvoice(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: PurchaseInvoiceFormValues) => {
      const res = await createPurchaseInvoice({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useUpdatePurchaseInvoice(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      purchaseInvoiceId,
      ...body
    }: Partial<PurchaseInvoiceFormValues> & { purchaseInvoiceId: string }) => {
      const res = await updatePurchaseInvoice({ path: { businessId, purchaseInvoiceId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useDeletePurchaseInvoice(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (purchaseInvoiceId: string) => {
      const res = await deletePurchaseInvoice({ path: { businessId, purchaseInvoiceId } })
      if (res.error) throw res.error
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useApprovePurchaseInvoice(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (purchaseInvoiceId: string) => {
      const res = await approvePurchaseInvoice({ path: { businessId, purchaseInvoiceId } })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useVoidPurchaseInvoice(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (purchaseInvoiceId: string) => {
      const res = await voidPurchaseInvoice({ path: { businessId, purchaseInvoiceId } })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function usePurchaseInvoiceTotals(businessId: string) {
  return useQuery({
    queryKey: [...purchaseInvoiceKeys.list(businessId), 'totals'],
    queryFn: async () => {
      const res = await getPurchaseInvoiceTotals({ path: { businessId } })
      if (res.error) throw res.error
      return res.data!.data
    },
    enabled: !!businessId,
  })
}