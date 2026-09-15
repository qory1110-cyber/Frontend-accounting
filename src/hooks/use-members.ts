import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listBusinessMembers,
  inviteBusinessMember,
  updateBusinessMemberRole,
  removeBusinessMember,
} from '@/integrations/generated-clients/accounting-client'

const memberKeys = {
  list: (businessId: string) => ['businesses', businessId, 'members'] as const,
}

export function useBusinessMembers(businessId: string) {
  return useQuery({
    queryKey: memberKeys.list(businessId),
    queryFn: async () => {
      const res = await listBusinessMembers({ path: { businessId } })
      if (res.error) throw res.error
      return res.data!.data
    },
    enabled: !!businessId,
  })
}

export function useInviteMember(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { email: string; role: 'admin' | 'accountant' | 'viewer' }) => {
      const res = await inviteBusinessMember({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKeys.list(businessId) }),
  })
}

export function useUpdateMemberRole(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'accountant' | 'viewer' }) => {
      const res = await updateBusinessMemberRole({ path: { businessId, userId }, body: { role } })
      if (res.error) throw res.error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKeys.list(businessId) }),
  })
}

export function useRemoveMember(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await removeBusinessMember({ path: { businessId, userId } })
      if (res.error) throw res.error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKeys.list(businessId) }),
  })
}