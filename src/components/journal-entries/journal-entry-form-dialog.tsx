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
import { useCreateJournalEntry } from '@/hooks/use-journal-entries'
import { useChartOfAccounts, useRecentChartOfAccounts } from '@/hooks/use-chart-of-accounts'
import { useProjects } from '@/hooks/use-projects'
import { getApiErrorMessage } from '@/lib/errors'
import { formatValidationIssues } from '@/lib/format-validation-issues'
import type { JournalEntryRow } from './journal-entries-page'

const toCents = (n: number) => Math.round(n * 100)

const lineSchema = z
  .object({
    accountId: z.string().min(1, 'Pilih akun'),
    projectId: z.string().optional(),
    debit: z.number().min(0, 'Debit tidak boleh negatif'),
    credit: z.number().min(0, 'Credit tidak boleh negatif'),
    description: z.string(),
  })
  .refine((l) => (l.debit > 0) !== (l.credit > 0), {
    message: 'Setiap baris harus berisi Debit saja atau Credit saja, dengan nilai lebih dari 0',
  })

const journalSchema = z
  .object({
    entryDate: z.string().min(1, 'Tanggal wajib diisi'),
    reference: z.string(),
    description: z.string(),
    lines: z.array(lineSchema).min(2, 'Minimal 2 baris'),
  })
  .refine(
    (v) =>
      v.lines.reduce((s, l) => s + toCents(l.debit), 0) === v.lines.reduce((s, l) => s + toCents(l.credit), 0),
    { message: 'Total Debit harus sama dengan Total Credit' },
  )

interface FormLine {
  projectId?: string
  accountId: string
  debit: number
  credit: number
  description: string
}

interface FormValues {
  entryDate: string
  reference: string
  description: string
  lines: FormLine[]
}

function todayLocal() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function emptyLine(): FormLine {
  return { accountId: '', debit: 0, credit: 0, description: '' }
}

// Jurnal baru: 2 baris kosong. Clone: salin deskripsi dan baris, tapi tanggal
// hari ini dan reference dikosongkan (otomatis dibuat backend).
function buildValues(cloneFrom: JournalEntryRow | null): FormValues {
  if (cloneFrom) {
    return {
      entryDate: todayLocal(),
      reference: '',
      description: cloneFrom.description ?? '',
      lines: cloneFrom.lines.map((l) => ({
        accountId: l.accountId,
        projectId: l.projectId ?? undefined,
        debit: l.debit,
        credit: l.credit,
        description: l.description ?? '',
      })),
    }
  }
  return { entryDate: todayLocal(), reference: '', description: '', lines: [emptyLine(), emptyLine()] }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function JournalEntryFormDialog({
  businessId,
  open,
  onOpenChange,
  cloneFrom,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  cloneFrom: JournalEntryRow | null
}) {
  const createEntry = useCreateJournalEntry(businessId)
  const { data: accounts } = useChartOfAccounts(businessId)
  const { data: recentAccounts } = useRecentChartOfAccounts(businessId)
  const { data: projectsData } = useProjects(businessId, 1, 100, { status: 'active' })
  const projectOptions = (projectsData?.data ?? []).map((p) => ({
    id: p.id,
    label: p.code ? `${p.code} - ${p.name}` : p.name,
  }))
  const [serverError, setServerError] = useState<string | null>(null)

  const glAccounts = (accounts ?? []).filter((a) => a.isActive)
  const accountOptions = glAccounts.map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))
  const recentOptions = (recentAccounts ?? [])
    .filter((a) => a.isActive)
    .map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))

  const form = useForm({
    defaultValues: buildValues(null),
    onSubmit: async ({ value }) => {
      setServerError(null)
      const result = journalSchema.safeParse(value)
      if (!result.success) {
        setServerError(formatValidationIssues(result.error.issues))
        return
      }
      const payload = {
        entryDate: value.entryDate,
        reference: value.reference || undefined,
        description: value.description || undefined,
        lines: value.lines.map((l) => ({
          accountId: l.accountId,
          projectId: l.projectId || undefined,
          debit: l.debit,
          credit: l.credit,
          description: l.description || undefined,
        })),
      }
      try {
        await createEntry.mutateAsync(payload)
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal membuat jurnal'))
      }
    },
  })

  // Setiap dialog dibuka, isi form dari awal: kosong, atau salinan jurnal yang di-clone.
  useEffect(() => {
    if (open) {
      form.reset(buildValues(cloneFrom))
      setServerError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cloneFrom])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{cloneFrom ? 'Clone Jurnal' : 'Jurnal Baru'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex min-w-0 flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="entryDate">
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
                      <div className="flex flex-wrap items-end gap-2">
                        <form.Field name={`lines[${index}].accountId`}>
                          {(field) => (
                            <div className="flex min-w-52 flex-1 flex-col gap-2">
                              <Label>Account</Label>
                              <Combobox
                                value={field.state.value}
                                onValueChange={(v) => field.handleChange(v)}
                                recentOptions={recentOptions}
                                searchOptions={accountOptions}
                                placeholder="Pilih akun"
                              />
                            </div>
                          )}
                        </form.Field>

                        <form.Field name={`lines[${index}].debit`}>
                          {(field) => (
                            <div className="flex w-32 flex-col gap-2">
                              <Label>Debit</Label>
                              <Input
                                type="number"
                                min="0"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(Number(e.target.value))}
                              />
                            </div>
                          )}
                        </form.Field>

                        <form.Field name={`lines[${index}].credit`}>
                          {(field) => (
                            <div className="flex w-32 flex-col gap-2">
                              <Label>Credit</Label>
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
                          disabled={linesField.state.value.length <= 2}
                          onClick={() => linesField.removeValue(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                                            <form.Field name={`lines[${index}].projectId`}>
                        {(field) => (
                          <div className="flex flex-col gap-2">
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

                      <form.Field name={`lines[${index}].description`}>
                        {(field) => (
                          <Input
                            placeholder="Deskripsi baris (opsional)"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                        )}
                      </form.Field>
                    </div>
                  ))}

                  <Button type="button" variant="outline" size="sm" onClick={() => linesField.pushValue(emptyLine())}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Line
                  </Button>
                </div>
              )}
            </form.Field>
          </div>

          <form.Subscribe selector={(state) => state.values.lines}>
            {(lines) => {
              const debit = lines.reduce((s, l) => s + toCents(l.debit || 0), 0) / 100
              const credit = lines.reduce((s, l) => s + toCents(l.credit || 0), 0) / 100
              const diff = Math.round((debit - credit) * 100) / 100
              return (
                <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/30 p-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Debit</p>
                    <p className="font-medium">{formatCurrency(debit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Credit</p>
                    <p className="font-medium">{formatCurrency(credit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Selisih</p>
                    <p className={diff === 0 ? 'font-medium' : 'font-medium text-destructive'}>
                      {formatCurrency(diff)}
                    </p>
                  </div>
                </div>
              )
            }}
          </form.Subscribe>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Buat Jurnal'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}