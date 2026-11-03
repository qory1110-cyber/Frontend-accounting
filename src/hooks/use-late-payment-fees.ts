import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listLatePaymentFees,
  createLatePaymentFee,
  updateLatePaymentFee,
  deleteLatePaymentFee,
} from '@/integrations/generated-clients/accounting-client'

export const latePaymentFeeKeys = {
  list: (businessId: string) => ['businesses', businessId, 'late-payment-fees'] as const,
}

export interface LatePaymentFeeFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
}

export function useLatePaymentFees(
  businessId: string,
  page = 1,
  pageSize = 10,
  filters: LatePaymentFeeFilters = {},
) {
  const { search, dateFrom, dateTo } = filters
  return useQuery({
    queryKey: [...latePaymentFeeKeys.list(businessId), page, pageSize, search ?? '', dateFrom ?? '', dateTo ?? ''],
    queryFn: async () => {
      const res = await listLatePaymentFees({
        path: { businessId },
        query: {
          page,
          pageSize,
          search: search || undefined,
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

interface LatePaymentFeeFormValues {
  customerId: string
  salesInvoiceId: string
  feeDate: string
  amount: number
}

export function useCreateLatePaymentFee(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: LatePaymentFeeFormValues) => {
      const res = await createLatePaymentFee({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: latePaymentFeeKeys.list(businessId) }),
  })
}

export function useUpdateLatePaymentFee(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      latePaymentFeeId,
      ...body
    }: Partial<LatePaymentFeeFormValues> & { latePaymentFeeId: string }) => {
      const res = await updateLatePaymentFee({ path: { businessId, latePaymentFeeId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: latePaymentFeeKeys.list(businessId) }),
  })
}

export function useDeleteLatePaymentFee(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (latePaymentFeeId: string) => {
      const res = await deleteLatePaymentFee({ path: { businessId, latePaymentFeeId } })
      if (res.error) throw res.error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: latePaymentFeeKeys.list(businessId) }),
  })
}