import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listBillableTimes,
  createBillableTime,
  updateBillableTime,
  deleteBillableTime,
  invoiceBillableTimes,
} from '@/integrations/generated-clients/accounting-client'

export const billableTimeKeys = {
  list: (businessId: string) => ['businesses', businessId, 'billable-times'] as const,
}

export type BillableTimeStatus = 'uninvoiced' | 'invoiced' | 'written_off'

export interface BillableTimeFilters {
  search?: string
  status?: BillableTimeStatus | ''
  customerId?: string
  dateFrom?: string
  dateTo?: string
}

export function useBillableTimes(
  businessId: string,
  page = 1,
  pageSize = 10,
  filters: BillableTimeFilters = {},
) {
  const { search, status, customerId, dateFrom, dateTo } = filters
  return useQuery({
    queryKey: [
      ...billableTimeKeys.list(businessId),
      page,
      pageSize,
      search ?? '',
      status ?? '',
      customerId ?? '',
      dateFrom ?? '',
      dateTo ?? '',
    ],
    queryFn: async () => {
      const res = await listBillableTimes({
        path: { businessId },
        query: {
          page,
          pageSize,
          search: search || undefined,
          status: status || undefined,
          customerId: customerId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      })
      if (res.error) throw res.error
      return { data: res.data!.data, pagination: res.data!.pagination }
    },
    enabled: !!businessId,
  })
}

interface BillableTimeCreateValues {
  customerId?: string
  workDate: string
  description?: string
  hourlyRate: number
  hours: number
  minutes: number
}

// Update: customerId & description boleh null supaya bisa dikosongkan.
interface BillableTimeUpdateValues {
  customerId?: string | null
  workDate?: string
  description?: string | null
  hourlyRate?: number
  hours?: number
  minutes?: number
  status?: 'written_off'
  writtenOffDate?: string
}

export function useCreateBillableTime(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: BillableTimeCreateValues) => {
      const res = await createBillableTime({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: billableTimeKeys.list(businessId) }),
  })
}

export function useUpdateBillableTime(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      billableTimeId,
      ...body
    }: BillableTimeUpdateValues & { billableTimeId: string }) => {
      const res = await updateBillableTime({ path: { businessId, billableTimeId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: billableTimeKeys.list(businessId) }),
  })
}

export function useDeleteBillableTime(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (billableTimeId: string) => {
      const res = await deleteBillableTime({ path: { businessId, billableTimeId } })
      if (res.error) throw res.error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: billableTimeKeys.list(businessId) }),
  })
}

// Penagihan membuat Sales Invoice baru, jadi seluruh cache bisnis ikut disegarkan
// (daftar Billable Time, Sales Invoices, dan angka terkait).
export function useInvoiceBillableTimes(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { customerId: string; billableTimeIds: string[] }) => {
      const res = await invoiceBillableTimes({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['businesses', businessId] }),
  })
}