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
import { useCreatePurchaseQuote, useUpdatePurchaseQuote } from '@/hooks/use-purchase-quotes'
import { useSuppliers, useRecentSuppliers } from '@/hooks/use-suppliers'
import { getApiErrorMessage } from '@/lib/errors'

const lineSchema = z.object({
  description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
  qty: z.number().positive('Qty harus > 0'),
  unitPrice: z.number().min(0, 'Tidak boleh negatif'),
})

const quoteSchema = z.object({
  supplierId: z.string().min(1, 'Pilih supplier'),
  issueDate: z.string().min(1, 'Wajib diisi'),
  reference: z.string(),
  description: z.string(),
  lines: z.array(lineSchema).min(1, 'Minimal 1 baris rincian'),
})

export interface PurchaseQuoteForForm {
  id: string
  supplierId: string
  supplierName: string
  issueDate: string
  reference: string | null
  description: string | null
  lines: { description: string; qty: string; unitPrice: string }[]
}

export type PurchaseQuoteFormMode = 'create' | 'edit' | 'clone'

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

export function PurchaseQuoteFormDialog({
  businessId,
  open,
  onOpenChange,
  quote,
  mode,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  quote?: PurchaseQuoteForForm | null
  mode: PurchaseQuoteFormMode
}) {
  const createQuote = useCreatePurchaseQuote(businessId)
  const updateQuote = useUpdatePurchaseQuote(businessId)
  const { data: suppliersData } = useSuppliers(businessId, 1, 100)
  const suppliers = suppliersData?.data ?? []
  const { data: recentSuppliers } = useRecentSuppliers(businessId)
  const [serverError, setServerError] = useState<string | null>(null)

  const isEditing = mode === 'edit' && !!quote

  const selectableSuppliers = suppliers.filter((s) => s.isActive || s.id === quote?.supplierId)

  const emptyValues = {
    supplierId: '',
    issueDate: new Date().toISOString().slice(0, 10),
    reference: '',
    description: '',
    lines: [{ description: '', qty: 1, unitPrice: 0 }],
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: quoteSchema },
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
          await updateQuote.mutateAsync({
            purchaseQuoteId: quote.id,
            supplierId: value.supplierId,
            issueDate: value.issueDate,
            reference: value.reference || null,
            description: value.description || null,
            lines,
          })
        } else {
          await createQuote.mutateAsync({
            supplierId: value.supplierId,
            issueDate: value.issueDate,
            reference: value.reference || undefined,
            description: value.description || undefined,
            lines,
          })
        }
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal menyimpan Purchase Quote'))
      }
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        quote
          ? {
              supplierId: quote.supplierId,
              // Clone: tanggal hari ini & reference dikosongkan supaya tidak dobel.
              issueDate: mode === 'clone' ? emptyValues.issueDate : quote.issueDate,
              reference: mode === 'clone' ? '' : (quote.reference ?? ''),
              description: quote.description ?? '',
              lines: quote.lines.map((l) => ({
                description: l.description,
                qty: Number(l.qty),
                unitPrice: Number(l.unitPrice),
              })),
            }
          : emptyValues,
      )
      setServerError(null)
    }
  }, [open, quote, mode])

  const title = isEditing ? 'Edit Purchase Quote' : mode === 'clone' ? 'Clone Purchase Quote' : 'Purchase Quote Baru'

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
                  <Label htmlFor={field.name}>Date</Label>
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
                    placeholder="PQ-2026-001"
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
                  onValueChange={(v) => field.handleChange(v)}
                  recentOptions={(recentSuppliers ?? [])
                    .filter((s) => s.isActive || s.id === quote?.supplierId)
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
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Purchase Quote'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}