import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listSalesInvoices,
  createSalesInvoice,
  updateSalesInvoice,
  deleteSalesInvoice,
  sendSalesInvoice,
  voidSalesInvoice,
  getSalesInvoiceTotals,
} from '@/integrations/generated-clients/accounting-client'

const salesInvoiceKeys = {
  list: (businessId: string) => ['businesses', businessId, 'sales-invoices'] as const,
}

export function useSalesInvoices(businessId: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [...salesInvoiceKeys.list(businessId), page, pageSize],
    queryFn: async () => {
      const res = await listSalesInvoices({ path: { businessId }, query: { page, pageSize } })
      if (res.error) throw res.error
      return { data: res.data!.data, pagination: res.data!.pagination }
    },
    enabled: !!businessId,
  })
}

interface SalesInvoiceLine {
  projectId?: string
  accountId: string
  qty: number
  unitPrice: number
}

interface SalesInvoiceFormValues {
  customerId: string
  issueDate: string
  dueDate?: string
  reference?: string
  billingAddress?: string
  description?: string
  lines: SalesInvoiceLine[]
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, businessId: string) {
  queryClient.invalidateQueries({ queryKey: salesInvoiceKeys.list(businessId) })
  // Send/Void memposting jurnal yang menyentuh akun COA & saldo bank - ikut refresh.
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'chart-of-accounts'] })
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'bank-accounts'] })
  // Send/Void mengubah total laba-rugi proyek.
  queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'projects'] })
}

export function useCreateSalesInvoice(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: SalesInvoiceFormValues) => {
      const res = await createSalesInvoice({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useUpdateSalesInvoice(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ salesInvoiceId, ...body }: Partial<SalesInvoiceFormValues> & { salesInvoiceId: string }) => {
      const res = await updateSalesInvoice({ path: { businessId, salesInvoiceId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useDeleteSalesInvoice(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (salesInvoiceId: string) => {
      const res = await deleteSalesInvoice({ path: { businessId, salesInvoiceId } })
      if (res.error) throw res.error
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useSendSalesInvoice(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (salesInvoiceId: string) => {
      const res = await sendSalesInvoice({ path: { businessId, salesInvoiceId } })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useVoidSalesInvoice(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (salesInvoiceId: string) => {
      const res = await voidSalesInvoice({ path: { businessId, salesInvoiceId } })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => invalidateAll(queryClient, businessId),
  })
}

export function useSalesInvoiceTotals(businessId: string) {
  return useQuery({
    queryKey: [...salesInvoiceKeys.list(businessId), 'totals'],
    queryFn: async () => {
      const res = await getSalesInvoiceTotals({ path: { businessId } })
      if (res.error) throw res.error
      return res.data!.data
    },
    enabled: !!businessId,
  })
}