import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listExpenseClaims,
  createExpenseClaim,
  deleteExpenseClaim,
} from '@/integrations/generated-clients/accounting-client'

export const expenseClaimKeys = {
  list: (businessId: string) => ['businesses', businessId, 'expense-claims'] as const,
}

export interface ExpenseClaimFilters {
  search?: string
  payerId?: string
  dateFrom?: string
  dateTo?: string
}

export function useExpenseClaims(
  businessId: string,
  page = 1,
  pageSize = 10,
  filters: ExpenseClaimFilters = {},
) {
  const { search, payerId, dateFrom, dateTo } = filters
  return useQuery({
    queryKey: [
      ...expenseClaimKeys.list(businessId),
      page,
      pageSize,
      search ?? '',
      payerId ?? '',
      dateFrom ?? '',
      dateTo ?? '',
    ],
    queryFn: async () => {
      const res = await listExpenseClaims({
        path: { businessId },
        query: {
          page,
          pageSize,
          search: search || undefined,
          payerId: payerId || undefined,
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

interface ExpenseClaimLine {
  accountId: string
  description?: string
  amount: number
}

interface ExpenseClaimFormValues {
  claimDate: string
  reference?: string
  payerId: string
  payee?: string
  description?: string
  lines: ExpenseClaimLine[]
}

export function useCreateExpenseClaim(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: ExpenseClaimFormValues) => {
      const res = await createExpenseClaim({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseClaimKeys.list(businessId) })
      queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'projects'] })
    },
  })
}

export function useDeleteExpenseClaim(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (claimId: string) => {
      const res = await deleteExpenseClaim({ path: { businessId, claimId } })
      if (res.error) throw res.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseClaimKeys.list(businessId) })
      queryClient.invalidateQueries({ queryKey: ['businesses', businessId, 'projects'] })
    },
  })
}