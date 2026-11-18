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
import { useCreateDebitNote } from '@/hooks/use-debit-notes'
import { useSuppliers, useRecentSuppliers } from '@/hooks/use-suppliers'
import { usePurchaseInvoices } from '@/hooks/use-purchase-invoices'
import { useChartOfAccounts, useRecentChartOfAccounts } from '@/hooks/use-chart-of-accounts'
import { getApiErrorMessage } from '@/lib/errors'

const lineSchema = z.object({
  accountId: z.string().min(1, 'Pilih akun'),
  qty: z.number().positive('Qty harus > 0'),
  unitPrice: z.number().min(0, 'Tidak boleh negatif'),
})

const noteSchema = z.object({
  supplierId: z.string().min(1, 'Pilih supplier'),
  purchaseInvoiceId: z.string(),
  issueDate: z.string().min(1, 'Wajib diisi'),
  reference: z.string(),
  description: z.string(),
  lines: z.array(lineSchema).min(1, 'Minimal 1 baris rincian'),
})

export interface DebitNoteForForm {
  id: string
  supplierId: string
  supplierName: string
  issueDate: string
  reference: string | null
  description: string | null
  lines: { accountId: string; accountName: string; qty: string; unitPrice: string }[]
}

// Debit Note tidak bisa diedit (sudah memposting jurnal): hanya buat baru atau clone.
export type DebitNoteFormMode = 'create' | 'clone'

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

export function DebitNoteFormDialog({
  businessId,
  open,
  onOpenChange,
  note,
  mode,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  note?: DebitNoteForForm | null
  mode: DebitNoteFormMode
}) {
  const createNote = useCreateDebitNote(businessId)
  const { data: suppliersData } = useSuppliers(businessId, 1, 100)
  const suppliers = suppliersData?.data ?? []
  const { data: recentSuppliers } = useRecentSuppliers(businessId)
  const { data: invoicesData } = usePurchaseInvoices(businessId, 1, 100)
  const invoices = invoicesData?.data ?? []
  const { data: accounts } = useChartOfAccounts(businessId)
  const { data: recentExpenseAccounts } = useRecentChartOfAccounts(businessId, 'Expense')
  const [serverError, setServerError] = useState<string | null>(null)

  const selectableSuppliers = suppliers.filter((s) => s.isActive || s.id === note?.supplierId)
  const usedAccountIds = new Set(note?.lines.map((l) => l.accountId))
  const expenseAccounts = (accounts ?? []).filter(
    (a) => a.category === 'Expense' && (a.isActive || usedAccountIds.has(a.id)),
  )

  const emptyValues = {
    supplierId: '',
    purchaseInvoiceId: '',
    issueDate: new Date().toISOString().slice(0, 10),
    reference: '',
    description: '',
    lines: [{ accountId: '', qty: 1, unitPrice: 0 }],
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: noteSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await createNote.mutateAsync({
          supplierId: value.supplierId,
          purchaseInvoiceId: value.purchaseInvoiceId || undefined,
          issueDate: value.issueDate,
          reference: value.reference || undefined,
          description: value.description || undefined,
          lines: value.lines.map((l) => ({
            accountId: l.accountId,
            qty: l.qty,
            unitPrice: l.unitPrice,
          })),
        })
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal menyimpan Debit Note'))
      }
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        note
          ? {
              supplierId: note.supplierId,
              // Clone: faktur dikosongkan, tanggal hari ini, reference dikosongkan supaya tidak dobel.
              purchaseInvoiceId: '',
              issueDate: emptyValues.issueDate,
              reference: '',
              description: note.description ?? '',
              lines: note.lines.map((l) => ({
                accountId: l.accountId,
                qty: Number(l.qty),
                unitPrice: Number(l.unitPrice),
              })),
            }
          : emptyValues,
      )
      setServerError(null)
    }
  }, [open, note, mode])

  const title = mode === 'clone' ? 'Clone Debit Note' : 'Debit Note Baru'

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
          <Alert>
            <AlertDescription>
              Debit Note langsung memposting jurnal (Debit Utang Usaha, Kredit akun beban) dan tidak bisa diedit.
              Bila dikaitkan ke faktur, Balance due faktur itu berkurang. Tanpa faktur, hanya utang supplier yang
              berkurang. Untuk koreksi, hapus lalu buat ulang.
            </AlertDescription>
          </Alert>

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
                    placeholder="DN/2026/11/001"
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
                    field.handleChange(v)
                    // Ganti supplier: faktur yang sudah dipilih tidak berlaku lagi.
                    form.setFieldValue('purchaseInvoiceId', '')
                  }}
                  recentOptions={(recentSuppliers ?? [])
                    .filter((s) => s.isActive || s.id === note?.supplierId)
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
              // Hanya faktur approved milik supplier terpilih yang masih punya sisa tagihan.
              const invoiceOptions = invoices
                .filter((inv) => inv.supplierId === supplierId && inv.status === 'approved' && inv.balanceDue > 0)
                .map((inv) => ({
                  id: inv.id,
                  label: `${inv.reference ?? 'Tanpa reference'} · ${inv.issueDate} · sisa ${formatCurrency(inv.balanceDue)}`,
                }))
              return (
                <form.Field name="purchaseInvoiceId">
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <Label>Purchase Invoice (opsional)</Label>
                        {field.state.value && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => field.handleChange('')}
                          >
                            Hapus pilihan
                          </Button>
                        )}
                      </div>
                      <Combobox
                        value={field.state.value}
                        onValueChange={(v) => field.handleChange(v)}
                        recentOptions={invoiceOptions}
                        searchOptions={invoiceOptions}
                        placeholder={supplierId ? 'Pilih faktur yang dipotong' : 'Pilih supplier dulu'}
                      />
                    </div>
                  )}
                </form.Field>
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
                  placeholder="Alasan retur atau koreksi"
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
                    onClick={() => linesField.pushValue({ accountId: '', qty: 1, unitPrice: 0 })}
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
                  {isSubmitting ? 'Menyimpan...' : 'Buat Debit Note'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}