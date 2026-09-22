import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/use-customers'
import { getApiErrorMessage } from '@/lib/errors'

const customerSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  code: z.string(),
  creditLimit: z.number().min(0, 'Tidak boleh negatif'),
  billingAddress: z.string(),
  deliveryAddress: z.string(),
  email: z.string().email('Format email tidak valid').or(z.literal('')),
  autofillSalesInvoiceDueDate: z.boolean(),
})

interface EditingCustomer {
  id: string
  name: string
  code: string | null
  creditLimit: string
  billingAddress: string | null
  deliveryAddress: string | null
  email: string | null
  autofillSalesInvoiceDueDate: boolean
}

export function CustomerFormDialog({
  businessId,
  open,
  onOpenChange,
  editingCustomer,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCustomer?: EditingCustomer | null
}) {
  const createCustomer = useCreateCustomer(businessId)
  const updateCustomer = useUpdateCustomer(businessId)
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!editingCustomer

  const emptyValues = {
    name: '',
    code: '',
    creditLimit: 0,
    billingAddress: '',
    deliveryAddress: '',
    email: '',
    autofillSalesInvoiceDueDate: false,
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: customerSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const payload = { ...value, email: value.email || undefined }
      try {
        if (isEditing) {
          await updateCustomer.mutateAsync({ customerId: editingCustomer.id, ...payload })
        } else {
          await createCustomer.mutateAsync(payload)
        }
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, isEditing ? 'Gagal menyimpan perubahan' : 'Gagal membuat pelanggan'))
      }
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        editingCustomer
          ? {
              name: editingCustomer.name,
              code: editingCustomer.code ?? '',
              creditLimit: Number(editingCustomer.creditLimit),
              billingAddress: editingCustomer.billingAddress ?? '',
              deliveryAddress: editingCustomer.deliveryAddress ?? '',
              email: editingCustomer.email ?? '',
              autofillSalesInvoiceDueDate: editingCustomer.autofillSalesInvoiceDueDate,
            }
          : emptyValues,
      )
      setServerError(null)
    }
  }, [open, editingCustomer])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Pelanggan' : 'Pelanggan Baru'}</DialogTitle>
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
                  placeholder="PT Telekomindo Sentosa"
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
                  placeholder="CUS-0021"
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
                  placeholder="billing@perusahaan.co.id"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="billingAddress">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Alamat Penagihan (opsional)</Label>
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

          <form.Field name="deliveryAddress">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Alamat Pengiriman (opsional)</Label>
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

          <form.Field name="autofillSalesInvoiceDueDate">
            {(field) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked === true)}
                />
                <Label htmlFor={field.name} className="font-normal">
                  Autofill jatuh tempo faktur penjualan
                </Label>
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
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan' : 'Buat Pelanggan'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}