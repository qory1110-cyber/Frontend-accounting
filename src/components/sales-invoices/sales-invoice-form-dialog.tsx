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
import { useCreateSalesInvoice, useUpdateSalesInvoice } from '@/hooks/use-sales-invoices'
import { useCustomers } from '@/hooks/use-customers'
import { useChartOfAccounts } from '@/hooks/use-chart-of-accounts'
import { getApiErrorMessage } from '@/lib/errors'
import { Combobox } from '@/components/ui/combobox'
import { useRecentCustomers } from '@/hooks/use-customers'
import { useRecentChartOfAccounts } from '@/hooks/use-chart-of-accounts'
import { useProjects } from '@/hooks/use-projects'

const lineSchema = z.object({
  accountId: z.string().min(1, 'Pilih akun'),
  projectId: z.string().optional(),
  qty: z.number().positive('Qty harus > 0'),
  unitPrice: z.number().min(0, 'Tidak boleh negatif'),
})

const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Pilih pelanggan'),
  issueDate: z.string().min(1, 'Wajib diisi'),
  dueDate: z.string(),
  reference: z.string(),
  billingAddress: z.string(),
  description: z.string(),
  lines: z.array(lineSchema).min(1, 'Minimal 1 baris rincian'),
})

interface InvoiceFormLine {
  accountId: string
  projectId?: string
  qty: number
  unitPrice: number
}

interface EditingInvoice {
  id: string
  customerId: string
  issueDate: string
  dueDate: string | null
  reference: string | null
  billingAddress: string | null
  description: string | null
  lines: { accountId: string; projectId?: string | null; qty: string; unitPrice: string }[]
}

export function SalesInvoiceFormDialog({
  businessId,
  open,
  onOpenChange,
  editingInvoice,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editingInvoice?: EditingInvoice | null
}) {
  const createInvoice = useCreateSalesInvoice(businessId)
  const updateInvoice = useUpdateSalesInvoice(businessId)
  const { data: customersData } = useCustomers(businessId, 1, 100)
const customers = customersData?.data
const { data: recentCustomers } = useRecentCustomers(businessId)
  const { data: accounts } = useChartOfAccounts(businessId)
  const { data: recentIncomeAccounts } = useRecentChartOfAccounts(businessId, 'Income')
  const { data: projectsData } = useProjects(businessId, 1, 100, { status: 'active' })
  const projectOptions = (projectsData?.data ?? []).map((p) => ({
    id: p.id,
    label: p.code ? `${p.code} - ${p.name}` : p.name,
  }))
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!editingInvoice

  const incomeAccounts = (accounts ?? []).filter((a) => a.category === 'Income' && a.isActive)
  const activeCustomers = (customers ?? []).filter((c) => c.isActive)

  const emptyValues = {
    customerId: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    reference: '',
    billingAddress: '',
    description: '',
    lines: [{ accountId: '', qty: 1, unitPrice: 0 }] as InvoiceFormLine[],
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: invoiceSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const payload = {
        ...value,
        dueDate: value.dueDate || undefined,
        reference: value.reference || undefined,
        billingAddress: value.billingAddress || undefined,
        description: value.description || undefined,
      }
      try {
        if (isEditing) {
          await updateInvoice.mutateAsync({ salesInvoiceId: editingInvoice.id, ...payload })
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
              customerId: editingInvoice.customerId,
              issueDate: editingInvoice.issueDate,
              dueDate: editingInvoice.dueDate ?? '',
              reference: editingInvoice.reference ?? '',
              billingAddress: editingInvoice.billingAddress ?? '',
              description: editingInvoice.description ?? '',
                lines: editingInvoice.lines.map((l) => ({
                accountId: l.accountId,
                projectId: l.projectId ?? undefined,
                qty: Number(l.qty),
                unitPrice: Number(l.unitPrice),
              })),
            }
          : emptyValues,
      )
      setServerError(null)
    }
  }, [open, editingInvoice])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Faktur (Draft)' : 'Faktur Penjualan Baru'}</DialogTitle>
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
                <div className="flex flex-col gap-2">
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
                <div className="flex flex-col gap-2">
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

          <form.Field name="customerId">
  {(field) => (
    <div className="flex flex-col gap-2">
      <Label>Customer</Label>
      <Combobox
        value={field.state.value}
        onValueChange={(v) => {
          field.handleChange(v)
          const selected = activeCustomers.find((c) => c.id === v)
          form.setFieldValue('billingAddress', selected?.billingAddress ?? '')
        }}
        recentOptions={(recentCustomers ?? [])
          .filter((c) => c.isActive)
          .map((c) => ({ id: c.id, label: c.code ? `${c.code} - ${c.name}` : c.name }))}
        searchOptions={activeCustomers.map((c) => ({ id: c.id, label: c.code ? `${c.code} - ${c.name}` : c.name }))}
        placeholder="Pilih pelanggan"
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
      <Label htmlFor={field.name}>Billing Address (opsional)</Label>
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

          <form.Field name="reference">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Reference (opsional)</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="INV/2026/08/012"
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
        recentOptions={(recentIncomeAccounts ?? [])
          .filter((a) => a.isActive)
          .map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))}
        searchOptions={incomeAccounts.map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))}
        placeholder="Akun Income"
      />
    </div>
  )}
</form.Field>

                                            <form.Field name={`lines[${index}].projectId`}>
                        {(field) => (
                          <div className="flex min-w-45 flex-1 flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <Label>Proyek (opsional)</Label>
                              {field.state.value && (
                                <button
                                  type="button"
                                  className="text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => field.handleChange(undefined)}
                                >
                                  ✕ Hapus
                                </button>
                              )}
                            </div>
                            <Combobox
                              value={field.state.value ?? ''}
                              onValueChange={(v) => field.handleChange(v || undefined)}
                              recentOptions={projectOptions}
                              searchOptions={projectOptions}
                              placeholder="Tanpa proyek"
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