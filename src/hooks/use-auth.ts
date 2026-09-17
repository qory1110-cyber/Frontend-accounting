import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { login, logout, getMe, updateMe, changePassword } from '@/integrations/generated-clients/accounting-client'
import { setTokens, clearTokens, getRefreshToken } from '@/lib/auth/tokens'
import { useNavigate } from '@tanstack/react-router'

export function useLogin() {
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      const res = await login({ body })
      if (res.error) throw res.error
      return res.data!.data // buka 2 lapis: SDK punya .data, backend juga bungkus .data
    },
    onSuccess: (tokens) => {
      setTokens(tokens.accessToken, tokens.refreshToken)
    },
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => logout({ body: { refreshToken: getRefreshToken() ?? '' } }),
    onSettled: () => {
      clearTokens()
      queryClient.clear() // <- baris baru: bersihkan SEMUA cache, cegah data user lama nyangkut
      navigate({ to: '/login' })
    },
  })
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await getMe()
      if (res.error) throw res.error
      return res.data!.data
    },
  })
}

export function useUpdateMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name?: string }) => {
      const res = await updateMe({ body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (body: { oldPassword: string; newPassword: string }) => {
      const res = await changePassword({ body })
      if (res.error) throw res.error
    },
  })
}