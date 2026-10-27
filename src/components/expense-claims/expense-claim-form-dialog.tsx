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
import { Plus, Trash2, X } from 'lucide-react'
import { useCreateExpenseClaim } from '@/hooks/use-expense-claims'
import { useExpenseClaimPayers } from '@/hooks/use-expense-claim-payers'
import { useChartOfAccounts, useRecentChartOfAccounts } from '@/hooks/use-chart-of-accounts'
import { useProjects } from '@/hooks/use-projects'
import { getApiErrorMessage } from '@/lib/errors'

const lineSchema = z.object({
  accountId: z.string().min(1, 'Pilih akun'),
  projectId: z.string(),
  description: z.string(),
  amount: z.number().positive('Jumlah harus > 0'),
})

const claimSchema = z.object({
  claimDate: z.string().min(1, 'Wajib diisi'),
  payerId: z.string().min(1, 'Pilih Payer'),
  reference: z.string(),
  payee: z.string(),
  description: z.string(),
  lines: z.array(lineSchema).min(1, 'Minimal 1 baris rincian'),
})

export interface ExpenseClaimForForm {
  payerId: string
  payee: string | null
  description: string | null
  lines: { accountId: string; projectId: string | null; description: string | null; amount: number }[]
}

export type ExpenseClaimFormMode = 'create' | 'clone'

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

export function ExpenseClaimFormDialog({
  businessId,
  open,
  onOpenChange,
  claim,
  mode,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  claim?: ExpenseClaimForForm | null
  mode: ExpenseClaimFormMode
}) {
  const createClaim = useCreateExpenseClaim(businessId)
  const { data: payers } = useExpenseClaimPayers(businessId)
  const { data: accounts } = useChartOfAccounts(businessId)
  const { data: recentExpenseAccounts } = useRecentChartOfAccounts(businessId, 'Expense')
  const [serverError, setServerError] = useState<string | null>(null)
  const { data: projectsData } = useProjects(businessId, 1, 100, { status: 'active' })
  const projectOptions = (projectsData?.data ?? []).map((p) => ({
    id: p.id,
    label: p.code ? `${p.code} - ${p.name}` : p.name,
  }))

  const payerOptions = (payers ?? []).filter((p) => p.isActive).map((p) => ({ id: p.id, label: p.name }))
  // Akun beban/aset yang aktif; akun kontrol (mis. Bank) tidak boleh dipakai di klaim.
  const accountOptions = (accounts ?? [])
    .filter((a) => a.isActive && !a.isControlAccount && (a.category === 'Expense' || a.category === 'Asset'))
    .map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))

  const emptyValues = {
    claimDate: new Date().toISOString().slice(0, 10),
    payerId: '',
    reference: '',
    payee: '',
    description: '',
    lines: [{ accountId: '', projectId: '', description: '', amount: 0 }],
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: claimSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await createClaim.mutateAsync({
          claimDate: value.claimDate,
          payerId: value.payerId,
          reference: value.reference || undefined,
          payee: value.payee || undefined,
          description: value.description || undefined,
          lines: value.lines.map((l) => ({
            accountId: l.accountId,
            projectId: l.projectId || undefined,
            description: l.description || undefined,
            amount: l.amount,
          })),
        })
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal menyimpan klaim biaya'))
      }
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        claim
          ? {
              // Clone: tanggal hari ini & reference dikosongkan supaya dibuat otomatis.
              claimDate: emptyValues.claimDate,
              payerId: claim.payerId,
              reference: '',
              payee: claim.payee ?? '',
              description: claim.description ?? '',
              lines: claim.lines.map((l) => ({
                accountId: l.accountId,
                projectId: l.projectId ?? '',
                description: l.description ?? '',
                amount: l.amount,
              })),
            }
          : emptyValues,
      )
      setServerError(null)
    }
  }, [open, claim, mode])

  const title = mode === 'clone' ? 'Clone Klaim Biaya' : 'Klaim Biaya Baru'

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
            <form.Field name="claimDate">
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
                    placeholder="Otomatis: EXP-0001"
                  />
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="payerId">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Payer</Label>
                <Combobox
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                  recentOptions={payerOptions}
                  searchOptions={payerOptions}
                  placeholder="Pilih Payer"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{errorText(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="payee">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Payee (opsional)</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Mis. SPBU Pertamina Daan Mogot"
                  maxLength={225}
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
                                .filter((a) => a.isActive)
                                .map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))}
                              searchOptions={accountOptions}
                              placeholder="Akun Beban / Aset"
                            />
                          </div>
                        )}
                      </form.Field>

                                            <form.Field name={`lines[${index}].projectId`}>
                        {(field) => (
                          <div className="flex min-w-45 flex-1 flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <Label>Project (opsional)</Label>
                              {field.state.value && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-xs"
                                  onClick={() => field.handleChange('')}
                                >
                                  <X className="mr-0.5 h-3 w-3" />
                                  Hapus
                                </Button>
                              )}
                            </div>
                            <Combobox
                              value={field.state.value}
                              onValueChange={(v) => field.handleChange(v)}
                              recentOptions={projectOptions}
                              searchOptions={projectOptions}
                              placeholder="Pilih proyek"
                            />
                          </div>
                        )}
                      </form.Field>

                      <form.Field name={`lines[${index}].description`}>
                        {(field) => (
                          <div className="flex min-w-45 flex-1 flex-col gap-2">
                            <Label>Description</Label>
                            <Input
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              placeholder="Keterangan baris"
                            />
                          </div>
                        )}
                      </form.Field>

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
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => linesField.pushValue({ accountId: '', projectId: '', description: '', amount: 0 })}
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
                  Total Klaim:{' '}
                  <span className="font-semibold">
                    {formatCurrency(lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0))}
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
                  {isSubmitting ? 'Menyimpan...' : 'Buat Klaim Biaya'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}