import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listMyBusinesses,
  createBusiness,
  getBusiness,
  updateBusiness,
} from '@/integrations/generated-clients/accounting-client'

const businessKeys = {
  all: ['businesses'] as const,
  detail: (id: string) => ['businesses', id] as const,
}

export function useBusinessesList() {
  return useQuery({
    queryKey: businessKeys.all,
    queryFn: async () => {
      const res = await listMyBusinesses()
      if (res.error) throw res.error
      return res.data!.data
    },
  })
}

export function useBusiness(businessId: string) {
  return useQuery({
    queryKey: businessKeys.detail(businessId),
    queryFn: async () => {
      const res = await getBusiness({ path: { businessId } })
      if (res.error) throw res.error
      return res.data!.data
    },
    enabled: !!businessId,
  })
}

export function useCreateBusiness() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; baseCurrencyCode?: string }) => {
      const res = await createBusiness({ body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessKeys.all }),
  })
}

export function useUpdateBusiness(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name?: string; baseCurrencyCode?: string }) => {
      const res = await updateBusiness({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessKeys.detail(businessId) }),
  })
}