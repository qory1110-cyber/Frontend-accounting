import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Combobox } from '@/components/ui/combobox'
import { X } from 'lucide-react'
import {
  useCreateProject,
  useUpdateProject,
  type ProjectStatus,
} from '@/hooks/use-projects'
import { useCustomers, useRecentCustomers } from '@/hooks/use-customers'
import { getApiErrorMessage } from '@/lib/errors'

const projectSchema = z.object({
  name: z.string().trim().min(1, 'Nama proyek wajib diisi'),
  code: z.string(),
  customerId: z.string(),
  status: z.enum(['active', 'inactive', 'completed']),
})

export interface ProjectForForm {
  id: string
  code: string | null
  name: string
  customerId: string | null
  customerName: string | null
  status: ProjectStatus
}

export type ProjectFormMode = 'create' | 'edit' | 'clone'

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  completed: 'Completed',
}

// Error validasi dari schema berupa objek { message }, bukan string biasa.
function errorText(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Input tidak valid'
}

export function ProjectFormDialog({
  businessId,
  open,
  onOpenChange,
  project,
  mode,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: ProjectForForm | null
  mode: ProjectFormMode
}) {
  const createProject = useCreateProject(businessId)
  const updateProject = useUpdateProject(businessId)
  const { data: customersData } = useCustomers(businessId, 1, 100)
  const customers = customersData?.data
  const { data: recentCustomers } = useRecentCustomers(businessId)
  const [serverError, setServerError] = useState<string | null>(null)

  const isEditing = mode === 'edit' && !!project

  // Pelanggan yang sedang dipakai tetap muncul walau sudah dinonaktifkan.
  const selectableCustomers = (customers ?? []).filter((c) => c.isActive || c.id === project?.customerId)

  const emptyValues = {
    name: '',
    code: '',
    customerId: '',
    status: 'active' as ProjectStatus,
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: projectSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        if (isEditing) {
          await updateProject.mutateAsync({
            projectId: project.id,
            body: {
              name: value.name.trim(),
              code: value.code.trim() || null,
              customerId: value.customerId || null,
              status: value.status,
            },
          })
        } else {
          await createProject.mutateAsync({
            name: value.name.trim(),
            code: value.code.trim() || undefined,
            customerId: value.customerId || undefined,
            status: value.status,
          })
        }
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal menyimpan proyek'))
      }
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        project
          ? {
              name: project.name,
              // Clone: kode dikosongkan supaya tidak dobel, status kembali Active.
              code: mode === 'clone' ? '' : (project.code ?? ''),
              customerId: project.customerId ?? '',
              status: mode === 'clone' ? 'active' : project.status,
            }
          : emptyValues,
      )
      setServerError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project, mode])

  const title = mode === 'edit' ? 'Edit Project' : mode === 'clone' ? 'Clone Project' : 'New Project'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex min-w-0 flex-col gap-4"
        >
          <form.Field name="name">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Contoh: Renovasi Gedung Kantor Cabang A"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{errorText(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="code">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Code (opsional)</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Contoh: PRJ-2026-003"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="customerId">
            {(field) => (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Customer (opsional)</Label>
                  {field.state.value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => field.handleChange('')}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Hapus pilihan
                    </Button>
                  )}
                </div>
                <Combobox
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                  recentOptions={(recentCustomers ?? [])
                    .filter((c) => c.isActive)
                    .map((c) => ({ id: c.id, label: c.name }))}
                  searchOptions={selectableCustomers.map((c) => ({ id: c.id, label: c.name }))}
                  placeholder="Pilih pelanggan pemilik proyek"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="status">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Status</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange((v ?? 'active') as ProjectStatus)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{(value: string) => STATUS_LABELS[value as ProjectStatus] ?? value}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}