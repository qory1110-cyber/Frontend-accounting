import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCreateSupplier, useUpdateSupplier } from '@/hooks/use-suppliers'
import { getApiErrorMessage } from '@/lib/errors'

const supplierSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  code: z.string(),
  creditLimit: z.number().min(0, 'Tidak boleh negatif'),
  address: z.string(),
  email: z.string().email('Format email tidak valid').or(z.literal('')),
})

interface EditingSupplier {
  id: string
  name: string
  code: string | null
  creditLimit: string
  address: string | null
  email: string | null
}

export function SupplierFormDialog({
  businessId,
  open,
  onOpenChange,
  editingSupplier,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editingSupplier?: EditingSupplier | null
}) {
  const createSupplier = useCreateSupplier(businessId)
  const updateSupplier = useUpdateSupplier(businessId)
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!editingSupplier

  const emptyValues = { name: '', code: '', creditLimit: 0, address: '', email: '' }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: supplierSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const payload = { ...value, email: value.email || undefined }
      try {
        if (isEditing) {
          await updateSupplier.mutateAsync({ supplierId: editingSupplier.id, ...payload })
        } else {
          await createSupplier.mutateAsync(payload)
        }
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, isEditing ? 'Gagal menyimpan perubahan' : 'Gagal membuat pemasok'))
      }
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        editingSupplier
          ? {
              name: editingSupplier.name,
              code: editingSupplier.code ?? '',
              creditLimit: Number(editingSupplier.creditLimit),
              address: editingSupplier.address ?? '',
              email: editingSupplier.email ?? '',
            }
          : emptyValues,
      )
      setServerError(null)
    }
  }, [open, editingSupplier])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Pemasok' : 'Pemasok Baru'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col gap-4"
        >
          <form.Field name="name">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Nama</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="PT Fiber Optik Nusantara"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="code">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Kode (opsional)</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="VEND-009"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="creditLimit">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Credit Limit (opsional)</Label>
                <Input
                  id={field.name}
                  type="number"
                  min="0"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Email (opsional)</Label>
                <Input
                  id={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="ap@perusahaan.co.id"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="address">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Alamat (opsional)</Label>
                <Textarea
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  rows={2}
                />
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
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan' : 'Buat Pemasok'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}