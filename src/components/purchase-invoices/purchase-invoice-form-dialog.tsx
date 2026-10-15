import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2 } from 'lucide-react'
import { useCreatePurchaseInvoice, useUpdatePurchaseInvoice } from '@/hooks/use-purchase-invoices'
import { useSuppliers } from '@/hooks/use-suppliers'
import { useChartOfAccounts, useRecentChartOfAccounts } from '@/hooks/use-chart-of-accounts'
import { getApiErrorMessage } from '@/lib/errors'
import { Combobox } from '@/components/ui/combobox'
import { useRecentSuppliers } from '@/hooks/use-suppliers'

const lineSchema = z.object({
  purchaseOrderLineId: z.string().optional(),
  accountId: z.string().min(1, 'Pilih akun'),
  qty: z.number().positive('Qty harus > 0'),
  unitPrice: z.number().min(0, 'Tidak boleh negatif'),
})

const invoiceSchema = z.object({
  purchaseOrderId: z.string().optional(),
  supplierId: z.string().min(1, 'Pilih pemasok'),
  issueDate: z.string().min(1, 'Wajib diisi'),
  dueDate: z.string(),
  reference: z.string(),
  description: z.string(),
  lines: z.array(lineSchema).min(1, 'Minimal 1 baris rincian'),
})

type InvoiceFormValues = z.infer<typeof invoiceSchema>

// Purchase Order sumber untuk fitur "Copy to Purchase Invoice".
export interface SourceOrder {
  id: string
  reference: string | null
  supplierId: string
  lines: { id: string; accountId: string; qty: string; unitPrice: string; qtyInvoiced: number }[]
}

interface EditingInvoice {
  id: string
  purchaseOrderId?: string | null
  purchaseOrderReference?: string | null
  supplierId: string
  issueDate: string
  dueDate: string | null
  reference: string | null
  description: string | null
  lines: { purchaseOrderLineId?: string | null; accountId: string; qty: string; unitPrice: string }[]
}

export function PurchaseInvoiceFormDialog({
  businessId,
  open,
  onOpenChange,
  editingInvoice,
  sourceOrder,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editingInvoice?: EditingInvoice | null
  sourceOrder?: SourceOrder | null
}) {
  const createInvoice = useCreatePurchaseInvoice(businessId)
  const updateInvoice = useUpdatePurchaseInvoice(businessId)
  const { data: suppliersData } = useSuppliers(businessId, 1, 100)
const suppliers = suppliersData?.data
const { data: recentSuppliers } = useRecentSuppliers(businessId)
  const { data: accounts } = useChartOfAccounts(businessId)
  const { data: recentExpenseAccounts } = useRecentChartOfAccounts(businessId, 'Expense')
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!editingInvoice
  const isLinked = !!(sourceOrder || editingInvoice?.purchaseOrderId)
  const linkedReference = sourceOrder ? sourceOrder.reference : (editingInvoice?.purchaseOrderReference ?? null)

  // Pemasok/akun yang sedang dipakai draft ini tetap ditampilkan walau sudah di-nonaktifkan,
  // supaya nilainya tidak "hilang" dari pilihan saat edit.
  const selectableSuppliers = (suppliers ?? []).filter(
    (s) => s.isActive || s.id === editingInvoice?.supplierId,
  )
  const usedAccountIds = new Set(editingInvoice?.lines.map((l) => l.accountId))
  const expenseAccounts = (accounts ?? []).filter(
    (a) => a.category === 'Expense' && (a.isActive || usedAccountIds.has(a.id)),
  )

  const emptyValues: InvoiceFormValues = {
    purchaseOrderId: undefined,
    supplierId: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    reference: '',
    description: '',
    lines: [{ accountId: '', qty: 1, unitPrice: 0 }],
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: invoiceSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
        const payload = {
        ...value,
        purchaseOrderId: value.purchaseOrderId || undefined,
        dueDate: value.dueDate || undefined,
        reference: value.reference || undefined,
        description: value.description || undefined,
      }
      try {
        if (isEditing) {
          await updateInvoice.mutateAsync({ purchaseInvoiceId: editingInvoice.id, ...payload })
        } else {
          await createInvoice.mutateAsync(payload)
        }
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, isEditing ? 'Gagal menyimpan perubahan' : 'Gagal membuat faktur'))
      }
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        editingInvoice
            ? {
              purchaseOrderId: editingInvoice.purchaseOrderId ?? undefined,
              supplierId: editingInvoice.supplierId,
              issueDate: editingInvoice.issueDate,
              dueDate: editingInvoice.dueDate ?? '',
              reference: editingInvoice.reference ?? '',
              description: editingInvoice.description ?? '',
              lines: editingInvoice.lines.map((l) => ({
                purchaseOrderLineId: l.purchaseOrderLineId ?? undefined,
                accountId: l.accountId,
                qty: Number(l.qty),
                unitPrice: Number(l.unitPrice),
              })),
            }
                    : sourceOrder
            ? {
                ...emptyValues,
                purchaseOrderId: sourceOrder.id,
                supplierId: sourceOrder.supplierId,
                // Hanya baris yang masih ada sisanya; Qty diisi sisa yang belum difakturkan.
                lines: sourceOrder.lines
                  .filter((l) => Number(l.qty) - l.qtyInvoiced > 0)
                  .map((l) => ({
                    purchaseOrderLineId: l.id,
                    accountId: l.accountId,
                    qty: Number(l.qty) - l.qtyInvoiced,
                    unitPrice: Number(l.unitPrice),
                  })),
              }
            : emptyValues,
      )
      setServerError(null)
    }
  }, [open, editingInvoice, sourceOrder])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Faktur Pembelian (Draft)' : 'Faktur Pembelian Baru'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        className="flex min-w-0 flex-col gap-4"
        >
          {isLinked && (
            <Alert>
              <AlertDescription>
                Faktur ini ditautkan ke Purchase Order{linkedReference ? ` ${linkedReference}` : ''}. Pemasok harus tetap
                sama dengan pemasok PO. {sourceOrder && 'Qty terisi dari sisa yang belum difakturkan.'}
              </AlertDescription>
            </Alert>
          )}
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
                    <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="dueDate">
              {(field) => (
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor={field.name}>Due Date (opsional)</Label>
                  <Input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
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
          .filter((s) => s.isActive || s.id === editingInvoice?.supplierId)
          .map((s) => ({ id: s.id, label: s.code ? `${s.code} - ${s.name}` : s.name }))}
        searchOptions={selectableSuppliers.map((s) => ({
          id: s.id,
          label: s.code ? `${s.code} - ${s.name}` : s.name,
        }))}
        placeholder="Pilih pemasok"
      />
      {field.state.meta.errors.length > 0 && (
        <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
      )}
    </div>
  )}
</form.Field>

          <form.Field name="reference">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Reference (opsional)</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="PINV/2026/09/001"
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
                      <form.Field name={`lines[${index}].accountId`}>
  {(field) => (
    <div className="flex min-w-45 flex-1 flex-col gap-2">
      <Label>Account</Label>
      <Combobox
        value={field.state.value}
        onValueChange={(v) => field.handleChange(v)}
        recentOptions={(recentExpenseAccounts ?? [])
          .filter((a) => a.isActive || usedAccountIds.has(a.id))
          .map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))}
        searchOptions={expenseAccounts.map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))}
        placeholder="Akun Expense"
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
                    onClick={() => linesField.pushValue({ accountId: '', qty: 1, unitPrice: 0 })}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Line
                  </Button>

                  {linesField.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">{String(linesField.state.meta.errors[0])}</p>
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
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Draft' : 'Buat Faktur (Draft)'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}