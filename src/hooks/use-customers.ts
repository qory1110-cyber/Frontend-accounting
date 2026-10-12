import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listCustomers,
  listRecentCustomers,
  createCustomer,
  updateCustomer,
  setCustomerActive,
  deleteCustomer,
} from '@/integrations/generated-clients/accounting-client'

const customerKeys = {
  list: (businessId: string) => ['businesses', businessId, 'customers'] as const,
}

export function useCustomers(businessId: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [...customerKeys.list(businessId), page, pageSize],
    queryFn: async () => {
      const res = await listCustomers({ path: { businessId }, query: { page, pageSize } })
      if (res.error) throw res.error
      return { data: res.data!.data, pagination: res.data!.pagination }
    },
    enabled: !!businessId,
  })
}

interface CustomerFormValues {
  name: string
  code?: string
  creditLimit?: number
  billingAddress?: string
  deliveryAddress?: string
  email?: string
  autofillSalesInvoiceDueDate?: boolean
}

export function useCreateCustomer(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CustomerFormValues) => {
      const res = await createCustomer({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.list(businessId) }),
  })
}

export function useUpdateCustomer(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ customerId, ...body }: Partial<CustomerFormValues> & { customerId: string }) => {
      const res = await updateCustomer({ path: { businessId, customerId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.list(businessId) }),
  })
}

export function useSetCustomerActive(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ customerId, isActive }: { customerId: string; isActive: boolean }) => {
      const res = await setCustomerActive({ path: { businessId, customerId }, body: { isActive } })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.list(businessId) }),
  })
}

export function useDeleteCustomer(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (customerId: string) => {
      const res = await deleteCustomer({ path: { businessId, customerId } })
      if (res.error) throw res.error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.list(businessId) }),
  })
}

export function useRecentCustomers(businessId: string, limit = 20) {
  return useQuery({
    queryKey: [...customerKeys.list(businessId), 'recent', limit],
    queryFn: async () => {
      const res = await listRecentCustomers({ path: { businessId }, query: { limit } })
      if (res.error) throw res.error
      return res.data!.data
    },
    enabled: !!businessId,
  })
}