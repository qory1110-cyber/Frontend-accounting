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
import { useCreateGoodsReceipt, useUpdateGoodsReceipt } from '@/hooks/use-goods-receipts'
import { useSuppliers, useRecentSuppliers } from '@/hooks/use-suppliers'
import { usePurchaseOrders } from '@/hooks/use-purchase-orders'
import { usePurchaseInvoices } from '@/hooks/use-purchase-invoices'
import { getApiErrorMessage } from '@/lib/errors'

const lineSchema = z.object({
  description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
  qty: z.number().positive('Qty harus > 0'),
})

const receiptSchema = z.object({
  supplierId: z.string().min(1, 'Pilih supplier'),
  receiptDate: z.string().min(1, 'Wajib diisi'),
  reference: z.string(),
  purchaseOrderId: z.string(),
  purchaseInvoiceId: z.string(),
  description: z.string(),
  lines: z.array(lineSchema).min(1, 'Minimal 1 baris rincian'),
})

export interface GoodsReceiptForForm {
  id: string
  supplierId: string
  supplierName: string
  purchaseOrderId: string | null
  purchaseInvoiceId: string | null
  receiptDate: string
  reference: string | null
  description: string | null
  lines: { description: string; qty: string }[]
}

export type GoodsReceiptFormMode = 'create' | 'edit' | 'clone'

// Error validasi dari schema berupa objek { message }, bukan string biasa.
function errorText(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Input tidak valid'
}

export function GoodsReceiptFormDialog({
  businessId,
  open,
  onOpenChange,
  receipt,
  mode,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  receipt?: GoodsReceiptForForm | null
  mode: GoodsReceiptFormMode
}) {
  const createReceipt = useCreateGoodsReceipt(businessId)
  const updateReceipt = useUpdateGoodsReceipt(businessId)
  const { data: suppliersData } = useSuppliers(businessId, 1, 100)
  const suppliers = suppliersData?.data ?? []
  const { data: recentSuppliers } = useRecentSuppliers(businessId)
  const { data: ordersData } = usePurchaseOrders(businessId, 1, 100)
  const orders = ordersData?.data ?? []
  const { data: invoicesData } = usePurchaseInvoices(businessId, 1, 100)
  const invoices = invoicesData?.data ?? []
  const [serverError, setServerError] = useState<string | null>(null)

  const isEditing = mode === 'edit' && !!receipt

  const selectableSuppliers = suppliers.filter((s) => s.isActive || s.id === receipt?.supplierId)

  const emptyValues = {
    supplierId: '',
    receiptDate: new Date().toISOString().slice(0, 10),
    reference: '',
    purchaseOrderId: '',
    purchaseInvoiceId: '',
    description: '',
    lines: [{ description: '', qty: 1 }],
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: receiptSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const lines = value.lines.map((l) => ({
        description: l.description.trim(),
        qty: l.qty,
      }))
      try {
        if (isEditing) {
          // Edit: field yang dikosongkan dikirim null supaya benar-benar terhapus.
          await updateReceipt.mutateAsync({
            goodsReceiptId: receipt.id,
            supplierId: value.supplierId,
            receiptDate: value.receiptDate,
            reference: value.reference || null,
            purchaseOrderId: value.purchaseOrderId || null,
            purchaseInvoiceId: value.purchaseInvoiceId || null,
            description: value.description || null,
            lines,
          })
        } else {
          await createReceipt.mutateAsync({
            supplierId: value.supplierId,
            receiptDate: value.receiptDate,
            reference: value.reference || undefined,
            purchaseOrderId: value.purchaseOrderId || undefined,
            purchaseInvoiceId: value.purchaseInvoiceId || undefined,
            description: value.description || undefined,
            lines,
          })
        }
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal menyimpan Goods Receipt'))
      }
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        receipt
          ? {
              supplierId: receipt.supplierId,
              // Clone: tanggal hari ini & reference dikosongkan supaya tidak dobel.
              receiptDate: mode === 'clone' ? emptyValues.receiptDate : receipt.receiptDate,
              reference: mode === 'clone' ? '' : (receipt.reference ?? ''),
              purchaseOrderId: receipt.purchaseOrderId ?? '',
              purchaseInvoiceId: receipt.purchaseInvoiceId ?? '',
              description: receipt.description ?? '',
              lines: receipt.lines.map((l) => ({
                description: l.description,
                qty: Number(l.qty),
              })),
            }
          : emptyValues,
      )
      setServerError(null)
    }
  }, [open, receipt, mode])

  const title = isEditing ? 'Edit Goods Receipt' : mode === 'clone' ? 'Clone Goods Receipt' : 'Goods Receipt Baru'

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
            <form.Field name="receiptDate">
              {(field) => (
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor={field.name}>Receipt Date</Label>
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
                    placeholder="GR/2026/11/001"
                  />
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="supplierId">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Supplier</Label>
                <Combobox
                  value={field.state.value}
                  onValueChange={(v) => {
                    const changed = v !== field.state.value
                    field.handleChange(v)
                    if (changed) {
                      // Order & invoice harus milik supplier yang dipilih, jadi dikosongkan saat supplier berganti.
                      form.setFieldValue('purchaseOrderId', '')
                      form.setFieldValue('purchaseInvoiceId', '')
                    }
                  }}
                  recentOptions={(recentSuppliers ?? [])
                    .filter((s) => s.isActive || s.id === receipt?.supplierId)
                    .map((s) => ({ id: s.id, label: s.code ? `${s.code} - ${s.name}` : s.name }))}
                  searchOptions={selectableSuppliers.map((s) => ({
                    id: s.id,
                    label: s.code ? `${s.code} - ${s.name}` : s.name,
                  }))}
                  placeholder="Pilih supplier"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{errorText(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.supplierId}>
            {(supplierId) => {
              const orderOptions = orders
                .filter((o) => o.supplierId === supplierId)
                .map((o) => ({
                  id: o.id,
                  label: `${o.reference || 'Tanpa referensi'} · ${o.orderDate}`,
                }))
              const invoiceOptions = invoices
                .filter((inv) => inv.supplierId === supplierId)
                .map((inv) => ({
                  id: inv.id,
                  label: `${inv.reference || 'Tanpa referensi'} · ${inv.issueDate}`,
                }))
              return (
                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="purchaseOrderId">
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
                          placeholder={supplierId ? 'Pilih Purchase Order' : 'Pilih supplier dulu'}
                        />
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="purchaseInvoiceId">
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
                          placeholder={supplierId ? 'Pilih Purchase Invoice' : 'Pilih supplier dulu'}
                        />
                      </div>
                    )}
                  </form.Field>
                </div>
              )
            }}
          </form.Subscribe>

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
                              placeholder="Nama barang yang diterima"
                            />
                            {field.state.meta.errors.length > 0 && (
                              <p className="text-xs text-destructive">{errorText(field.state.meta.errors[0])}</p>
                            )}
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
                              step="any"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(Number(e.target.value))}
                            />
                            {field.state.meta.errors.length > 0 && (
                              <p className="text-xs text-destructive">{errorText(field.state.meta.errors[0])}</p>
                            )}
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
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Goods Receipt'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}