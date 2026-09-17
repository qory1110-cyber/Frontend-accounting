import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listUsers, createUser } from '@/integrations/generated-clients/accounting-client'

const userKeys = {
  all: ['users'] as const,
}

export function useUsersList() {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: async () => {
      const res = await listUsers()
      if (res.error) throw res.error
      return res.data!.data
    },
  })
}

interface CreateUserBody {
  name: string
  email: string
  password: string
  assignments: { businessId: string; role: 'admin' | 'accountant' | 'viewer' }[]
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateUserBody) => {
      const res = await createUser({ body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}