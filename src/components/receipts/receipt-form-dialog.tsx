import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2 } from 'lucide-react'
import { useCreateReceipt } from '@/hooks/use-receipts'
import { useBankAccounts } from '@/hooks/use-bank-accounts'
import { useCustomers, useRecentCustomers } from '@/hooks/use-customers'
import { useSuppliers, useRecentSuppliers } from '@/hooks/use-suppliers'
import { mergeRecentContacts } from '@/lib/merge-recent-contacts'
import { useSalesInvoices } from '@/hooks/use-sales-invoices'
import { useChartOfAccounts, useRecentChartOfAccounts } from '@/hooks/use-chart-of-accounts'
import { getApiErrorMessage } from '@/lib/errors'
import { Combobox } from '@/components/ui/combobox'
import { useRecentBankAccounts } from '@/hooks/use-bank-accounts'
import { formatValidationIssues } from '@/lib/format-validation-issues'
import { useProjects } from '@/hooks/use-projects'

const lineSchema = z
  .object({
    mode: z.enum(['invoice', 'account']),
    salesInvoiceId: z.string(),
    accountId: z.string(),
    projectId: z.string(),
    amount: z.number().positive('Jumlah harus > 0'),
  })
  .refine((l) => (l.mode === 'invoice' ? l.salesInvoiceId.length > 0 : l.accountId.length > 0), {
    message: 'Pilih faktur atau akun',
  })

const receiptSchema = z.object({
  receiptDate: z.string().min(1, 'Wajib diisi'),
  reference: z.string(),
  receivedInBankAccountId: z.string().min(1, 'Pilih akun bank/kas'),
  paidByContactId: z.string(),
  description: z.string(),
  lines: z.array(lineSchema).min(1, 'Minimal 1 baris rincian'),
})

export function ReceiptFormDialog({
  businessId,
  open,
  onOpenChange,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createReceipt = useCreateReceipt(businessId)
  const { data: bankAccountsData } = useBankAccounts(businessId, 1, 100)
const bankAccounts = bankAccountsData?.data
const { data: recentBankAccounts } = useRecentBankAccounts(businessId)
const { data: customersData } = useCustomers(businessId, 1, 100)
const customers = customersData?.data
const { data: suppliersData } = useSuppliers(businessId, 1, 100)
const suppliers = suppliersData?.data
const { data: recentCustomers } = useRecentCustomers(businessId)
const { data: recentSuppliers } = useRecentSuppliers(businessId)
const { data: invoicesData } = useSalesInvoices(businessId, 1, 100)
const invoices = invoicesData?.data
  const { data: accounts } = useChartOfAccounts(businessId)
  const { data: recentAccounts } = useRecentChartOfAccounts(businessId)
  const [serverError, setServerError] = useState<string | null>(null)

  const activeBankAccounts = (bankAccounts ?? []).filter((a) => a.isActive)

  // "Paid by" bisa siapa saja - gabungkan Customer dan Supplier, hilangkan duplikat kalau
  // satu kontak sekaligus Customer dan Supplier (sesuai desain tabel contacts sejak awal).
  const contactMap = new Map<string, { id: string; name: string }>()
  for (const c of customers ?? []) if (c.isActive) contactMap.set(c.id, { id: c.id, name: c.name })
  for (const s of suppliers ?? []) if (s.isActive) contactMap.set(s.id, { id: s.id, name: s.name })
  const contacts = [...contactMap.values()]

  const sentInvoices = (invoices ?? []).filter((inv) => inv.status === 'sent' && inv.balanceDue > 0)
  const glAccounts = (accounts ?? []).filter((a) => a.isActive)

  const { data: projectsData } = useProjects(businessId, 1, 100, { status: 'active' })
  const projectOptions = (projectsData?.data ?? []).map((p) => ({
    id: p.id,
    label: p.code ? `${p.code} - ${p.name}` : p.name,
  }))

  const emptyValues = {
    receiptDate: new Date().toISOString().slice(0, 10),
    reference: '',
    receivedInBankAccountId: '',
    paidByContactId: '',
    description: '',
    lines: [{ mode: 'invoice' as 'invoice' | 'account', salesInvoiceId: '', accountId: '', projectId: '', amount: 0 }],
  }

  const form = useForm({
  defaultValues: emptyValues,
  onSubmit: async ({ value }) => {
    setServerError(null)
    const result = receiptSchema.safeParse(value)
    if (!result.success) {
      setServerError(formatValidationIssues(result.error.issues))
      return
    }
    const payload = {
        receiptDate: value.receiptDate,
        reference: value.reference || undefined,
        receivedInBankAccountId: value.receivedInBankAccountId,
        paidByContactId: value.paidByContactId || undefined,
        description: value.description || undefined,
        lines: value.lines.map((l) =>
l.mode === 'invoice'
            ? { salesInvoiceId: l.salesInvoiceId, amount: l.amount }
            : { accountId: l.accountId, projectId: l.projectId || undefined, amount: l.amount },
        ),
      }
      try {
        await createReceipt.mutateAsync(payload)
        form.reset(emptyValues)
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal membuat penerimaan'))
      }
    },
  })

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
          <DialogTitle>Penerimaan Baru</DialogTitle>
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

          <form.Field name="receivedInBankAccountId">
  {(field) => (
    <div className="flex flex-col gap-2">
      <Label>Received in</Label>
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

          <form.Field name="paidByContactId">
  {(field) => (
    <div className="flex flex-col gap-2">
      <Label>Paid by (opsional)</Label>
      <Combobox
        value={field.state.value}
        onValueChange={(v) => field.handleChange(v)}
        recentOptions={mergeRecentContacts(recentCustomers, recentSuppliers)}
        searchOptions={contacts.map((c) => ({ id: c.id, label: c.name }))}
        placeholder="Pilih kontak"
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
  <div key={index} className="flex flex-col gap-2 rounded-md border p-3">
    <form.Field name={`lines[${index}].mode`}>
      {(modeField) => (
        <>
          <Select
            value={modeField.state.value}
            onValueChange={(v) => modeField.handleChange((v ?? 'invoice') as 'invoice' | 'account')}
          >
            <SelectTrigger className="h-8 w-48">
              <SelectValue>
                {(value: string) => (value === 'invoice' ? 'Lunasi Faktur' : 'Posting ke Akun GL')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice">Lunasi Faktur</SelectItem>
              <SelectItem value="account">Posting ke Akun GL</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex flex-wrap items-end gap-2">
            {modeField.state.value === 'invoice' ? (
              <form.Field name={`lines[${index}].salesInvoiceId`}>
  {(field) => (
    <div className="flex min-w-52 flex-1 flex-col gap-2">
      <Label>Sales Invoice</Label>
      <Select
        value={field.state.value}
        onValueChange={(v) => {
          field.handleChange(v ?? '')
          // Isi Paid by otomatis dari pelanggan faktur, hanya kalau masih kosong.
          const inv = sentInvoices.find((i) => i.id === v)
          if (inv && !form.state.values.paidByContactId) {
            form.setFieldValue('paidByContactId', inv.customerId)
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Pilih faktur (status sent)">
            {(value: string) => {
              const inv = sentInvoices.find((i) => i.id === value)
              return inv
                ? `${inv.reference ?? inv.customerName} - sisa ${inv.balanceDue.toLocaleString('id-ID')}`
                : 'Pilih faktur'
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {sentInvoices.map((inv) => (
            <SelectItem key={inv.id} value={inv.id}>
              {inv.reference ?? inv.customerName} - {inv.customerName} - sisa{' '}
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
        searchOptions={glAccounts.map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))}
        placeholder="Pilih akun"
      />
    </div>
  )}
</form.Field>
            )}

            {modeField.state.value === 'account' && (
              <form.Field name={`lines[${index}].projectId`}>
                {(field) => (
                  <div className="flex min-w-52 flex-1 flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Proyek (opsional)</Label>
                      {field.state.value && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => field.handleChange('')}
                        >
                          ✕ Hapus
                        </button>
                      )}
                    </div>
                    <Combobox
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v)}
                      recentOptions={projectOptions}
                      searchOptions={projectOptions}
                      placeholder="Tanpa proyek"
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

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      linesField.pushValue({ mode: 'invoice' as 'invoice' | 'account', salesInvoiceId: '', accountId: '', projectId: '', amount: 0 })
                    }
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
                  {isSubmitting ? 'Menyimpan...' : 'Buat Penerimaan'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}