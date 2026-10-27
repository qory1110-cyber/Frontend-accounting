import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, FolderKanban, Pencil, Trash2, Copy, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useProjects, useDeleteProject, useSetProjectStatus, type ProjectStatus } from '@/hooks/use-projects'
import { useBusiness } from '@/hooks/use-businesses'
import { getApiErrorMessage } from '@/lib/errors'
import { ProjectFormDialog, type ProjectFormMode } from './project-form-dialog'

interface Project {
  id: string
  code: string | null
  name: string
  customerId: string | null
  customerName: string | null
  status: ProjectStatus
  totalIncome: number
  totalExpenses: number
  netProfit: number
  updatedAt: string
}

const PAGE_SIZE = 10

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  completed: 'Completed',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  if (status === 'active') {
    return <Badge className="bg-green-600 text-white hover:bg-green-600/90">Active</Badge>
  }
  if (status === 'completed') {
    return <Badge className="bg-blue-600 text-white hover:bg-blue-600/90">Completed</Badge>
  }
  return <Badge variant="secondary">Inactive</Badge>
}

export function ProjectsPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all')
  const [page, setPage] = useState(1)

  // Tunda pencarian 300 ms supaya tidak memanggil API di setiap ketikan.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: projectsData, isLoading } = useProjects(businessId, page, PAGE_SIZE, {
    search: debouncedSearch,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })
  const projects = projectsData?.data ?? []
  const pagination = projectsData?.pagination

  useEffect(() => {
    if (pagination && pagination.totalPages > 0 && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const deleteProject = useDeleteProject(businessId)
  const setStatus = useSetProjectStatus(businessId)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<ProjectFormMode>('create')
  const [formProject, setFormProject] = useState<Project | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const canWrite = business?.role === 'admin' || business?.role === 'accountant'
  const hasFilter = !!search || statusFilter !== 'all'

  function openForm(mode: ProjectFormMode, project: Project | null) {
    setFormMode(mode)
    setFormProject(project)
    setFormOpen(true)
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setPage(1)
  }

  function runAction(action: () => Promise<unknown>) {
    setActionError(null)
    action().catch((err) => setActionError(getApiErrorMessage(err, 'Aksi gagal dijalankan')))
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Projects</h1>
        {canWrite && (
          <Button size="sm" onClick={() => openForm('create', null)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Cari nama atau kode proyek..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="min-w-60 flex-1"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter((v ?? 'all') as 'all' | ProjectStatus)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: string) => (value === 'all' ? 'Semua status' : STATUS_LABELS[value as ProjectStatus])}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      {actionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

      {!isLoading && projects.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <FolderKanban className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasFilter ? 'Tidak ada proyek yang cocok.' : 'Belum ada proyek.'}
          </p>
        </div>
      )}

      {projects.length > 0 && (
        <div className="rounded-lg border bg-background">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex flex-wrap items-center justify-between gap-y-2 border-b px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{project.name}</span>
                  {project.code && (
                    <Badge variant="outline" className="font-mono font-normal">
                      {project.code}
                    </Badge>
                  )}
                  <StatusBadge status={project.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {project.customerName ?? 'Tanpa pelanggan'} · Income:{' '}
                  <span className="font-medium text-foreground">{formatCurrency(project.totalIncome)}</span> ·
                  Expenses:{' '}
                  <span className="font-medium text-foreground">{formatCurrency(project.totalExpenses)}</span> · Net:{' '}
                  <span
                    className={
                      project.netProfit < 0 ? 'font-medium text-destructive' : 'font-medium text-foreground'
                    }
                  >
                    {formatCurrency(project.netProfit)}
                  </span>
                </p>
              </div>

              {canWrite && (
                <div className="flex shrink-0 items-center gap-1">
                  <Select
                    value={project.status}
                    onValueChange={(v) =>
                      runAction(() =>
                        setStatus.mutateAsync({ projectId: project.id, status: (v ?? project.status) as ProjectStatus }),
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-32" title="Ubah status">
                      <SelectValue>{(value: string) => STATUS_LABELS[value as ProjectStatus] ?? value}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openForm('edit', project)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openForm('clone', project)}
                    title="Clone"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => runAction(() => deleteProject.mutateAsync(project.id))}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-end gap-1 border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              <span>
                Halaman {pagination.currentPage} dari {pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <ProjectFormDialog
        businessId={businessId}
        open={formOpen}
        onOpenChange={setFormOpen}
        project={formProject}
        mode={formMode}
      />
    </div>
  )
}