import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2 } from 'lucide-react'
import { useCreatePayment } from '@/hooks/use-payments'
import { useBankAccounts } from '@/hooks/use-bank-accounts'
import { useCustomers, useRecentCustomers } from '@/hooks/use-customers'
import { useSuppliers, useRecentSuppliers } from '@/hooks/use-suppliers'
import { mergeRecentContacts } from '@/lib/merge-recent-contacts'
import { usePurchaseInvoices } from '@/hooks/use-purchase-invoices'
import { useExpenseClaimPayers } from '@/hooks/use-expense-claim-payers'
import { useExpenseClaims } from '@/hooks/use-expense-claims'
import { useChartOfAccounts, useRecentChartOfAccounts } from '@/hooks/use-chart-of-accounts'
import { getApiErrorMessage } from '@/lib/errors'
import { Combobox } from '@/components/ui/combobox'
import { useRecentBankAccounts } from '@/hooks/use-bank-accounts'
import { formatValidationIssues } from '@/lib/format-validation-issues'

type LineMode = 'invoice' | 'claim' | 'account'

const lineSchema = z
  .object({
    mode: z.enum(['invoice', 'claim', 'account']),
    purchaseInvoiceId: z.string(),
    expenseClaimId: z.string(),
    accountId: z.string(),
    amount: z.number().positive('Jumlah harus > 0'),
  })
  .refine(
    (l) =>
      l.mode === 'invoice'
        ? l.purchaseInvoiceId.length > 0
        : l.mode === 'claim'
          ? l.expenseClaimId.length > 0
          : l.accountId.length > 0,
    { message: 'Pilih faktur, klaim, atau akun' },
  )

const paymentSchema = z.object({
  paymentDate: z.string().min(1, 'Wajib diisi'),
  reference: z.string(),
  paidFromBankAccountId: z.string().min(1, 'Pilih akun bank/kas'),
  payeeContactId: z.string().min(1, 'Pilih payee'),
  description: z.string(),
  lines: z.array(lineSchema).min(1, 'Minimal 1 baris rincian'),
})

function newLine() {
  return {
    mode: 'invoice' as LineMode,
    purchaseInvoiceId: '',
    expenseClaimId: '',
    accountId: '',
    amount: 0,
  }
}

export function PaymentFormDialog({
  businessId,
  open,
  onOpenChange,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createPayment = useCreatePayment(businessId)
  const { data: bankAccountsData } = useBankAccounts(businessId, 1, 100)
  const bankAccounts = bankAccountsData?.data
  const { data: recentBankAccounts } = useRecentBankAccounts(businessId)
  const { data: suppliersData } = useSuppliers(businessId, 1, 100)
  const suppliers = suppliersData?.data
  const { data: customersData } = useCustomers(businessId, 1, 100)
  const customers = customersData?.data
  const { data: recentCustomers } = useRecentCustomers(businessId)
  const { data: recentSuppliers } = useRecentSuppliers(businessId)
  const { data: invoicesData } = usePurchaseInvoices(businessId, 1, 100)
  const invoices = invoicesData?.data
  const { data: payers } = useExpenseClaimPayers(businessId)
  const { data: accounts } = useChartOfAccounts(businessId)
  const { data: recentAccounts } = useRecentChartOfAccounts(businessId)
  const [serverError, setServerError] = useState<string | null>(null)

  const activeBankAccounts = (bankAccounts ?? []).filter((a) => a.isActive)

  // Payee bisa siapa saja - gabungkan Supplier, Customer, dan Payer klaim biaya
  // (untuk mengganti uang karyawan), hilangkan duplikat kalau satu kontak
  // punya beberapa peran.
  const contactMap = new Map<string, { id: string; name: string }>()
  for (const s of suppliers ?? []) if (s.isActive) contactMap.set(s.id, { id: s.id, name: s.name })
  for (const c of customers ?? []) if (c.isActive) contactMap.set(c.id, { id: c.id, name: c.name })
  for (const p of payers ?? [])
    if (p.isActive) contactMap.set(p.contactId, { id: p.contactId, name: `${p.name} (Payer)` })
  const contacts = [...contactMap.values()]

  const approvedInvoices = (invoices ?? []).filter((inv) => inv.status === 'approved' && inv.balanceDue > 0)
  const glAccounts = (accounts ?? []).filter((a) => a.isActive)

  const emptyValues = {
    paymentDate: new Date().toISOString().slice(0, 10),
    reference: '',
    paidFromBankAccountId: '',
    payeeContactId: '',
    description: '',
    lines: [newLine()],
  }

  const form = useForm({
    defaultValues: emptyValues,
    onSubmit: async ({ value }) => {
      setServerError(null)
      const result = paymentSchema.safeParse(value)
      if (!result.success) {
        setServerError(formatValidationIssues(result.error.issues))
        return
      }
      const payload = {
        paymentDate: value.paymentDate,
        reference: value.reference || undefined,
        paidFromBankAccountId: value.paidFromBankAccountId,
        payeeContactId: value.payeeContactId,
        description: value.description || undefined,
        lines: value.lines.map((l) =>
          l.mode === 'invoice'
            ? { purchaseInvoiceId: l.purchaseInvoiceId, amount: l.amount }
            : l.mode === 'claim'
              ? { expenseClaimId: l.expenseClaimId, amount: l.amount }
              : { accountId: l.accountId, amount: l.amount },
        ),
      }
      try {
        await createPayment.mutateAsync(payload)
        form.reset(emptyValues)
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal membuat pembayaran'))
      }
    },
  })

  // Klaim yang bisa dibayar = klaim milik Payer yang dipilih sebagai Payee
  // dan masih ada sisa. Kalau Payee bukan Payer, daftarnya kosong.
  const payeeContactId = useStore(form.store, (s) => s.values.payeeContactId)
  const selectedPayer = (payers ?? []).find((p) => p.contactId === payeeContactId)
  const { data: claimsData } = useExpenseClaims(businessId, 1, 100, { payerId: selectedPayer?.id })
  const unpaidClaims = selectedPayer
    ? (claimsData?.data ?? []).filter((c) => c.payerId === selectedPayer.id && c.balanceDue > 0)
    : []

  function modeLabel(mode: string) {
    if (mode === 'invoice') return 'Lunasi Faktur'
    if (mode === 'claim') return 'Bayar Klaim Biaya'
    return 'Posting ke Akun GL'
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) {
          form.reset(emptyValues)
          setServerError(null)
        }
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pembayaran Baru</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex min-w-0 flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="paymentDate">
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
                    <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="reference">
              {(field) => (
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor={field.name}>Reference (opsional, otomatis kalau kosong)</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="paidFromBankAccountId">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Paid from</Label>
                <Combobox
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                  recentOptions={(recentBankAccounts ?? [])
                    .filter((a) => a.isActive)
                    .map((a) => ({ id: a.id, label: a.code ? `${a.code} - ${a.name}` : a.name }))}
                  searchOptions={activeBankAccounts.map((a) => ({
                    id: a.id,
                    label: a.code ? `${a.code} - ${a.name}` : a.name,
                  }))}
                  placeholder="Pilih akun bank/kas"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="payeeContactId">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Payee</Label>
                <Combobox
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                  recentOptions={mergeRecentContacts(recentCustomers, recentSuppliers)}
                  searchOptions={contacts.map((c) => ({ id: c.id, label: c.name }))}
                  placeholder="Pilih penerima"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
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
                    <div key={index} className="flex flex-col gap-2 rounded-md border p-3">
                      <form.Field name={`lines[${index}].mode`}>
                        {(modeField) => (
                          <>
                            <Select
                              value={modeField.state.value}
                              onValueChange={(v) => modeField.handleChange((v ?? 'invoice') as LineMode)}
                            >
                              <SelectTrigger className="h-8 w-56">
                                <SelectValue>{(value: string) => modeLabel(value)}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="invoice">Lunasi Faktur</SelectItem>
                                <SelectItem value="claim">Bayar Klaim Biaya</SelectItem>
                                <SelectItem value="account">Posting ke Akun GL</SelectItem>
                              </SelectContent>
                            </Select>

                            <div className="flex flex-wrap items-end gap-2">
                              {modeField.state.value === 'claim' ? (
                                <form.Field name={`lines[${index}].expenseClaimId`}>
                                  {(field) => (
                                    <div className="flex min-w-52 flex-1 flex-col gap-2">
                                      <Label>Klaim Biaya</Label>
                                      <Select
                                        value={field.state.value}
                                        onValueChange={(v) => {
                                          field.handleChange(v ?? '')
                                          const claim = unpaidClaims.find((c) => c.id === v)
                                          if (claim) form.setFieldValue(`lines[${index}].amount`, claim.balanceDue)
                                        }}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Pilih klaim">
                                            {(value: string) => {
                                              const claim = unpaidClaims.find((c) => c.id === value)
                                              return claim
                                                ? `${claim.reference} - sisa ${claim.balanceDue.toLocaleString('id-ID')}`
                                                : 'Pilih klaim'
                                            }}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          {unpaidClaims.length === 0 ? (
                                            <p className="px-2 py-1.5 text-xs text-muted-foreground">
                                              {selectedPayer
                                                ? 'Tidak ada klaim yang belum lunas.'
                                                : 'Pilih Payee yang bertanda (Payer) dulu.'}
                                            </p>
                                          ) : (
                                            unpaidClaims.map((claim) => (
                                              <SelectItem key={claim.id} value={claim.id}>
                                                {claim.reference} - {claim.claimDate} - sisa{' '}
                                                {claim.balanceDue.toLocaleString('id-ID')}
                                              </SelectItem>
                                            ))
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </form.Field>
                              ) : modeField.state.value === 'invoice' ? (
                                <form.Field name={`lines[${index}].purchaseInvoiceId`}>
                                  {(field) => (
                                    <div className="flex min-w-52 flex-1 flex-col gap-2">
                                      <Label>Purchase Invoice</Label>
                                      <Select value={field.state.value} onValueChange={(v) => field.handleChange(v ?? '')}>
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Pilih faktur (status approved)">
                                            {(value: string) => {
                                              const inv = approvedInvoices.find((i) => i.id === value)
                                              return inv
                                                ? `${inv.reference ?? inv.supplierName} - sisa ${inv.balanceDue.toLocaleString('id-ID')}`
                                                : 'Pilih faktur'
                                            }}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          {approvedInvoices.map((inv) => (
                                            <SelectItem key={inv.id} value={inv.id}>
                                              {inv.reference ?? inv.supplierName} - {inv.supplierName} - sisa{' '}
                                              {inv.balanceDue.toLocaleString('id-ID')}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </form.Field>
                              ) : (
                                <form.Field name={`lines[${index}].accountId`}>
                                  {(field) => (
                                    <div className="flex min-w-52 flex-1 flex-col gap-2">
                                      <Label>Account</Label>
                                      <Combobox
                                        value={field.state.value}
                                        onValueChange={(v) => field.handleChange(v)}
                                        recentOptions={(recentAccounts ?? [])
                                          .filter((a) => a.isActive)
                                          .map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))}
                                        searchOptions={glAccounts.map((a) => ({
                                          id: a.id,
                                          label: `${a.code} - ${a.name}`,
                                        }))}
                                        placeholder="Pilih akun"
                                      />
                                    </div>
                                  )}
                                </form.Field>
                              )}

                              <form.Field name={`lines[${index}].amount`}>
                                {(field) => (
                                  <div className="flex w-36 flex-col gap-2">
                                    <Label>Amount</Label>
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
                          </>
                        )}
                      </form.Field>
                    </div>
                  ))}

                  <Button type="button" variant="outline" size="sm" onClick={() => linesField.pushValue(newLine())}>
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
                  {isSubmitting ? 'Menyimpan...' : 'Buat Pembayaran'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}