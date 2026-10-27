import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listProjects,
  createProject,
  updateProject,
  setProjectStatus,
  deleteProject,
} from '@/integrations/generated-clients/accounting-client'

export type ProjectStatus = 'active' | 'inactive' | 'completed'

export const projectKeys = {
  list: (businessId: string) => ['businesses', businessId, 'projects'] as const,
}

export interface ProjectFilters {
  search?: string
  status?: ProjectStatus
}

export function useProjects(businessId: string, page = 1, pageSize = 10, filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: [...projectKeys.list(businessId), page, pageSize, filters],
    queryFn: async () => {
      const res = await listProjects({
        path: { businessId },
        query: {
          page,
          pageSize,
          search: filters.search || undefined,
          status: filters.status,
        },
      })
      if (res.error) throw res.error
      return { data: res.data!.data, pagination: res.data!.pagination }
    },
    enabled: !!businessId,
  })
}

export interface ProjectCreateValues {
  name: string
  code?: string
  customerId?: string
  status: ProjectStatus
}

export interface ProjectUpdateValues {
  name?: string
  code?: string | null
  customerId?: string | null
  status?: ProjectStatus
}

export function useCreateProject(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: ProjectCreateValues) => {
      const res = await createProject({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list(businessId) }),
  })
}

export function useUpdateProject(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, body }: { projectId: string; body: ProjectUpdateValues }) => {
      const res = await updateProject({ path: { businessId, projectId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list(businessId) }),
  })
}

export function useSetProjectStatus(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: ProjectStatus }) => {
      const res = await setProjectStatus({ path: { businessId, projectId }, body: { status } })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list(businessId) }),
  })
}

export function useDeleteProject(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (projectId: string) => {
      const res = await deleteProject({ path: { businessId, projectId } })
      if (res.error) throw res.error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list(businessId) }),
  })
}