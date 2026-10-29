import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Combobox } from '@/components/ui/combobox'
import { Plus, Trash2 } from 'lucide-react'
import { useCreateSalesOrder, useUpdateSalesOrder } from '@/hooks/use-sales-orders'
import { useCustomers, useRecentCustomers } from '@/hooks/use-customers'
import { getApiErrorMessage } from '@/lib/errors'

const lineSchema = z.object({
  description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
  qty: z.number().positive('Qty harus > 0'),
  unitPrice: z.number().min(0, 'Tidak boleh negatif'),
})

const orderSchema = z.object({
  customerId: z.string().min(1, 'Pilih pelanggan'),
  issueDate: z.string().min(1, 'Wajib diisi'),
  reference: z.string(),
  description: z.string(),
  lines: z.array(lineSchema).min(1, 'Minimal 1 baris rincian'),
})

export interface SalesOrderForForm {
  id: string
  customerId: string
  customerName: string
  issueDate: string
  reference: string | null
  description: string | null
  lines: { description: string; qty: string; unitPrice: string }[]
}

export type SalesOrderFormMode = 'create' | 'edit' | 'clone'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

// Error validasi dari schema berupa objek { message }, bukan string biasa.
function errorText(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Input tidak valid'
}

export function SalesOrderFormDialog({
  businessId,
  open,
  onOpenChange,
  order,
  mode,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: SalesOrderForForm | null
  mode: SalesOrderFormMode
}) {
  const createOrder = useCreateSalesOrder(businessId)
  const updateOrder = useUpdateSalesOrder(businessId)
  const { data: customersData } = useCustomers(businessId, 1, 100)
  const customers = customersData?.data ?? []
  const { data: recentCustomers } = useRecentCustomers(businessId)
  const [serverError, setServerError] = useState<string | null>(null)

  const isEditing = mode === 'edit' && !!order

  const selectableCustomers = customers.filter((c) => c.isActive || c.id === order?.customerId)

  const emptyValues = {
    customerId: '',
    issueDate: new Date().toISOString().slice(0, 10),
    reference: '',
    description: '',
    lines: [{ description: '', qty: 1, unitPrice: 0 }],
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: orderSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const lines = value.lines.map((l) => ({
        description: l.description.trim(),
        qty: l.qty,
        unitPrice: l.unitPrice,
      }))
      try {
        if (isEditing) {
          // Edit: field yang dikosongkan dikirim null supaya benar-benar terhapus.
          await updateOrder.mutateAsync({
            salesOrderId: order.id,
            customerId: value.customerId,
            issueDate: value.issueDate,
            reference: value.reference || null,
            description: value.description || null,
            lines,
          })
        } else {
          await createOrder.mutateAsync({
            customerId: value.customerId,
            issueDate: value.issueDate,
            reference: value.reference || undefined,
            description: value.description || undefined,
            lines,
          })
        }
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal menyimpan Sales Order'))
      }
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        order
          ? {
              customerId: order.customerId,
              // Clone: tanggal hari ini & reference dikosongkan supaya tidak dobel.
              issueDate: mode === 'clone' ? emptyValues.issueDate : order.issueDate,
              reference: mode === 'clone' ? '' : (order.reference ?? ''),
              description: order.description ?? '',
              lines: order.lines.map((l) => ({
                description: l.description,
                qty: Number(l.qty),
                unitPrice: Number(l.unitPrice),
              })),
            }
          : emptyValues,
      )
      setServerError(null)
    }
  }, [open, order, mode])

  const title = isEditing ? 'Edit Sales Order' : mode === 'clone' ? 'Clone Sales Order' : 'Sales Order Baru'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
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
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="issueDate">
              {(field) => (
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor={field.name}>Issue Date</Label>
                  <Input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">{errorText(field.state.meta.errors[0])}</p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="reference">
              {(field) => (
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor={field.name}>Reference (opsional)</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="SO/2026/10/001"
                  />
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="customerId">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Customer</Label>
                <Combobox
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                  recentOptions={(recentCustomers ?? [])
                    .filter((c) => c.isActive || c.id === order?.customerId)
                    .map((c) => ({ id: c.id, label: c.code ? `${c.code} - ${c.name}` : c.name }))}
                  searchOptions={selectableCustomers.map((c) => ({
                    id: c.id,
                    label: c.code ? `${c.code} - ${c.name}` : c.name,
                  }))}
                  placeholder="Pilih pelanggan"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{errorText(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Description (opsional)</Label>
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

          <div className="flex flex-col gap-2">
            <Label>Rincian</Label>
            <form.Field name="lines" mode="array">
              {(linesField) => (
                <div className="flex flex-col gap-3">
                  {linesField.state.value.map((_, index) => (
                    <div key={index} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
                      <form.Field name={`lines[${index}].description`}>
                        {(field) => (
                          <div className="flex min-w-45 flex-1 flex-col gap-2">
                            <Label>Description</Label>
                            <Input
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              placeholder="Nama barang / jasa"
                            />
                          </div>
                        )}
                      </form.Field>

                      <form.Field name={`lines[${index}].qty`}>
                        {(field) => (
                          <div className="flex w-24 flex-col gap-2">
                            <Label>Qty</Label>
                            <Input
                              type="number"
                              min="0"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(Number(e.target.value))}
                            />
                          </div>
                        )}
                      </form.Field>

                      <form.Field name={`lines[${index}].unitPrice`}>
                        {(field) => (
                          <div className="flex w-36 flex-col gap-2">
                            <Label>Unit Price</Label>
                            <Input
                              type="number"
                              min="0"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(Number(e.target.value))}
                            />
                          </div>
                        )}
                      </form.Field>

                      <form.Subscribe selector={(state) => state.values.lines[index]}>
                        {(line) => (
                          <div className="flex w-32 flex-col gap-2">
                            <Label>Total</Label>
                            <p className="flex h-9 items-center text-sm">
                              {formatCurrency((line?.qty ?? 0) * (line?.unitPrice ?? 0))}
                            </p>
                          </div>
                        )}
                      </form.Subscribe>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        disabled={linesField.state.value.length <= 1}
                        onClick={() => linesField.removeValue(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => linesField.pushValue({ description: '', qty: 1, unitPrice: 0 })}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Line
                  </Button>

                  {linesField.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">{errorText(linesField.state.meta.errors[0])}</p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => state.values.lines}>
              {(lines) => (
                <p className="text-right text-sm">
                  Total Amount:{' '}
                  <span className="font-semibold">
                    {formatCurrency(lines.reduce((sum, l) => sum + (l.qty || 0) * (l.unitPrice || 0), 0))}
                  </span>
                </p>
              )}
            </form.Subscribe>
          </div>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Sales Order'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}