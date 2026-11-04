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
import { useCreateDeliveryNote, useUpdateDeliveryNote } from '@/hooks/use-delivery-notes'
import { useCustomers, useRecentCustomers } from '@/hooks/use-customers'
import { useSalesOrders } from '@/hooks/use-sales-orders'
import { useSalesInvoices } from '@/hooks/use-sales-invoices'
import { getApiErrorMessage } from '@/lib/errors'

const lineSchema = z.object({
  description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
  qty: z.number().positive('Qty harus > 0'),
})

const noteSchema = z.object({
  customerId: z.string().min(1, 'Pilih pelanggan'),
  deliveryDate: z.string().min(1, 'Wajib diisi'),
  reference: z.string(),
  salesOrderId: z.string(),
  salesInvoiceId: z.string(),
  deliveryAddress: z.string(),
  description: z.string(),
  lines: z.array(lineSchema).min(1, 'Minimal 1 baris rincian'),
})

export interface DeliveryNoteForForm {
  id: string
  customerId: string
  customerName: string
  salesOrderId: string | null
  salesInvoiceId: string | null
  deliveryDate: string
  reference: string | null
  deliveryAddress: string | null
  description: string | null
  lines: { description: string; qty: string }[]
}

export type DeliveryNoteFormMode = 'create' | 'edit' | 'clone'

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

export function DeliveryNoteFormDialog({
  businessId,
  open,
  onOpenChange,
  note,
  mode,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  note?: DeliveryNoteForForm | null
  mode: DeliveryNoteFormMode
}) {
  const createNote = useCreateDeliveryNote(businessId)
  const updateNote = useUpdateDeliveryNote(businessId)
  const { data: customersData } = useCustomers(businessId, 1, 100)
  const customers = customersData?.data ?? []
  const { data: recentCustomers } = useRecentCustomers(businessId)
  const { data: ordersData } = useSalesOrders(businessId, 1, 100)
  const orders = ordersData?.data ?? []
  const { data: invoicesData } = useSalesInvoices(businessId, 1, 100)
  const invoices = invoicesData?.data ?? []
  const [serverError, setServerError] = useState<string | null>(null)

  const isEditing = mode === 'edit' && !!note

  const selectableCustomers = customers.filter((c) => c.isActive || c.id === note?.customerId)

  const emptyValues = {
    customerId: '',
    deliveryDate: new Date().toISOString().slice(0, 10),
    reference: '',
    salesOrderId: '',
    salesInvoiceId: '',
    deliveryAddress: '',
    description: '',
    lines: [{ description: '', qty: 1 }],
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: noteSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const lines = value.lines.map((l) => ({
        description: l.description.trim(),
        qty: l.qty,
      }))
      try {
        if (isEditing) {
          // Edit: field yang dikosongkan dikirim null supaya benar-benar terhapus.
          await updateNote.mutateAsync({
            deliveryNoteId: note.id,
            customerId: value.customerId,
            deliveryDate: value.deliveryDate,
            reference: value.reference || null,
            salesOrderId: value.salesOrderId || null,
            salesInvoiceId: value.salesInvoiceId || null,
            deliveryAddress: value.deliveryAddress || null,
            description: value.description || null,
            lines,
          })
        } else {
          await createNote.mutateAsync({
            customerId: value.customerId,
            deliveryDate: value.deliveryDate,
            reference: value.reference || undefined,
            salesOrderId: value.salesOrderId || undefined,
            salesInvoiceId: value.salesInvoiceId || undefined,
            deliveryAddress: value.deliveryAddress || undefined,
            description: value.description || undefined,
            lines,
          })
        }
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal menyimpan Delivery Note'))
      }
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        note
          ? {
              customerId: note.customerId,
              // Clone: tanggal hari ini & reference dikosongkan supaya tidak dobel.
              deliveryDate: mode === 'clone' ? emptyValues.deliveryDate : note.deliveryDate,
              reference: mode === 'clone' ? '' : (note.reference ?? ''),
              salesOrderId: note.salesOrderId ?? '',
              salesInvoiceId: note.salesInvoiceId ?? '',
              deliveryAddress: note.deliveryAddress ?? '',
              description: note.description ?? '',
              lines: note.lines.map((l) => ({
                description: l.description,
                qty: Number(l.qty),
              })),
            }
          : emptyValues,
      )
      setServerError(null)
    }
  }, [open, note, mode])

  const title = isEditing ? 'Edit Delivery Note' : mode === 'clone' ? 'Clone Delivery Note' : 'Delivery Note Baru'

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
            <form.Field name="deliveryDate">
              {(field) => (
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor={field.name}>Delivery Date</Label>
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
                    placeholder="SJ/2026/11/001"
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
                  onValueChange={(v) => {
                    const changed = v !== field.state.value
                    field.handleChange(v)
                    if (changed) {
                      // Order & invoice harus milik pelanggan yang dipilih, jadi dikosongkan saat pelanggan berganti.
                      form.setFieldValue('salesOrderId', '')
                      form.setFieldValue('salesInvoiceId', '')
                      // Alamat pengiriman terisi otomatis dari pelanggan, tapi tetap bisa diubah manual.
                      const picked = customers.find((c) => c.id === v)
                      if (picked) form.setFieldValue('deliveryAddress', picked.billingAddress ?? '')
                    }
                  }}
                  recentOptions={(recentCustomers ?? [])
                    .filter((c) => c.isActive || c.id === note?.customerId)
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

          <form.Subscribe selector={(state) => state.values.customerId}>
            {(customerId) => {
              const orderOptions = orders
                .filter((o) => o.customerId === customerId)
                .map((o) => ({
                  id: o.id,
                  label: `${o.reference || 'Tanpa referensi'} · ${o.issueDate} · ${formatCurrency(o.totalAmount)}`,
                }))
              const invoiceOptions = invoices
                .filter((inv) => inv.customerId === customerId)
                .map((inv) => ({
                  id: inv.id,
                  label: `${inv.reference || 'Tanpa referensi'} · ${inv.issueDate} · ${formatCurrency(inv.invoiceAmount)}`,
                }))
              return (
                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="salesOrderId">
                    {(field) => (
                      <div className="flex min-w-0 flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <Label>Order Number (opsional)</Label>
                          {field.state.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => field.handleChange('')}
                            >
                              Kosongkan
                            </Button>
                          )}
                        </div>
                        <Combobox
                          value={field.state.value}
                          onValueChange={(v) => field.handleChange(v)}
                          recentOptions={orderOptions}
                          searchOptions={orderOptions}
                          placeholder={customerId ? 'Pilih Sales Order' : 'Pilih pelanggan dulu'}
                        />
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="salesInvoiceId">
                    {(field) => (
                      <div className="flex min-w-0 flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <Label>Invoice Number (opsional)</Label>
                          {field.state.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => field.handleChange('')}
                            >
                              Kosongkan
                            </Button>
                          )}
                        </div>
                        <Combobox
                          value={field.state.value}
                          onValueChange={(v) => field.handleChange(v)}
                          recentOptions={invoiceOptions}
                          searchOptions={invoiceOptions}
                          placeholder={customerId ? 'Pilih Sales Invoice' : 'Pilih pelanggan dulu'}
                        />
                      </div>
                    )}
                  </form.Field>
                </div>
              )
            }}
          </form.Subscribe>

          <form.Field name="deliveryAddress">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Delivery Address (opsional)</Label>
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
                              placeholder="Nama barang yang dikirim"
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
                    onClick={() => linesField.pushValue({ description: '', qty: 1 })}
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
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Delivery Note'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}