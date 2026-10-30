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
import { useCreateCreditNote } from '@/hooks/use-credit-notes'
import { useCustomers, useRecentCustomers } from '@/hooks/use-customers'
import { useChartOfAccounts, useRecentChartOfAccounts } from '@/hooks/use-chart-of-accounts'
import { getApiErrorMessage } from '@/lib/errors'

const lineSchema = z.object({
  accountId: z.string().min(1, 'Pilih akun'),
  qty: z.number().positive('Qty harus > 0'),
  unitPrice: z.number().min(0, 'Tidak boleh negatif'),
})

const noteSchema = z.object({
  customerId: z.string().min(1, 'Pilih pelanggan'),
  issueDate: z.string().min(1, 'Wajib diisi'),
  reference: z.string(),
  description: z.string(),
  lines: z.array(lineSchema).min(1, 'Minimal 1 baris rincian'),
})

export interface CreditNoteForForm {
  id: string
  customerId: string
  customerName: string
  issueDate: string
  reference: string | null
  description: string | null
  lines: { accountId: string; accountName: string; qty: string; unitPrice: string }[]
}

// Credit Note tidak bisa diedit (sudah memposting jurnal): hanya buat baru atau clone.
export type CreditNoteFormMode = 'create' | 'clone'

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

export function CreditNoteFormDialog({
  businessId,
  open,
  onOpenChange,
  note,
  mode,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  note?: CreditNoteForForm | null
  mode: CreditNoteFormMode
}) {
  const createNote = useCreateCreditNote(businessId)
  const { data: customersData } = useCustomers(businessId, 1, 100)
  const customers = customersData?.data ?? []
  const { data: recentCustomers } = useRecentCustomers(businessId)
  const { data: accounts } = useChartOfAccounts(businessId)
  const { data: recentIncomeAccounts } = useRecentChartOfAccounts(businessId, 'Income')
  const [serverError, setServerError] = useState<string | null>(null)

  const selectableCustomers = customers.filter((c) => c.isActive || c.id === note?.customerId)
  const usedAccountIds = new Set(note?.lines.map((l) => l.accountId))
  const incomeAccounts = (accounts ?? []).filter(
    (a) => a.category === 'Income' && (a.isActive || usedAccountIds.has(a.id)),
  )

  const emptyValues = {
    customerId: '',
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
          customerId: value.customerId,
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
        setServerError(getApiErrorMessage(err, 'Gagal menyimpan Credit Note'))
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

  const title = mode === 'clone' ? 'Clone Credit Note' : 'Credit Note Baru'

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
              Credit Note langsung memposting jurnal (Debit akun pendapatan, Kredit Piutang Usaha) dan tidak bisa
              diedit. Untuk koreksi, hapus lalu buat ulang.
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
                    placeholder="CN/2026/10/001"
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
                              recentOptions={(recentIncomeAccounts ?? [])
                                .filter((a) => a.isActive || usedAccountIds.has(a.id))
                                .map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))}
                              searchOptions={incomeAccounts.map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))}
                              placeholder="Akun Income"
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
                  {isSubmitting ? 'Menyimpan...' : 'Buat Credit Note'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}