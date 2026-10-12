import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Combobox } from '@/components/ui/combobox'
import { useCreateBankReconciliation, useUpdateBankReconciliation } from '@/hooks/use-bank-reconciliations'
import { useBankAccounts, useRecentBankAccounts } from '@/hooks/use-bank-accounts'
import { getApiErrorMessage } from '@/lib/errors'
import { formatValidationIssues } from '@/lib/format-validation-issues'

const reconciliationSchema = z.object({
  bankAccountId: z.string().min(1, 'Pilih akun bank/kas'),
  reconciliationDate: z.string().min(1, 'Tanggal wajib diisi'),
  statementBalance: z.number().finite('Statement Balance wajib diisi'),
})

export function BankReconciliationFormDialog({
  businessId,
  open,
  onOpenChange,
  reconciliation,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  // null = mode buat baru, terisi = mode edit (bank tidak bisa diganti).
  reconciliation: {
    id: string
    bankAccountId: string
    bankAccountName: string
    reconciliationDate: string
    statementBalance: number
  } | null
}) {
  const isEdit = !!reconciliation
  const createMutation = useCreateBankReconciliation(businessId)
  const updateMutation = useUpdateBankReconciliation(businessId)
  const { data: bankAccountsData } = useBankAccounts(businessId, 1, 100)
  const { data: recentBankAccounts } = useRecentBankAccounts(businessId)
  const [serverError, setServerError] = useState<string | null>(null)

  const activeBankAccounts = (bankAccountsData?.data ?? []).filter((a) => a.isActive)

  const emptyValues = {
    bankAccountId: reconciliation?.bankAccountId ?? '',
    reconciliationDate: reconciliation?.reconciliationDate ?? new Date().toISOString().slice(0, 10),
    statementBalance: reconciliation?.statementBalance ?? 0,
  }

  const form = useForm({
    defaultValues: emptyValues,
    onSubmit: async ({ value }) => {
      setServerError(null)
      const parsed = reconciliationSchema.safeParse(value)
      if (!parsed.success) {
        setServerError(formatValidationIssues(parsed.error.issues))
        return
      }
      try {
        if (isEdit) {
          await updateMutation.mutateAsync({
            reconciliationId: reconciliation.id,
            body: { reconciliationDate: value.reconciliationDate, statementBalance: value.statementBalance },
          })
        } else {
          await createMutation.mutateAsync({
            bankAccountId: value.bankAccountId,
            reconciliationDate: value.reconciliationDate,
            statementBalance: value.statementBalance,
          })
        }
        form.reset(emptyValues)
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal menyimpan rekonsiliasi bank'))
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Bank Reconciliation' : 'New Bank Reconciliation'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col gap-4"
        >
          <form.Field name="bankAccountId">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Bank Account</Label>
                {isEdit ? (
                  <Input value={reconciliation.bankAccountName} disabled />
                ) : (
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
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="reconciliationDate">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Date (tanggal cutoff)</Label>
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

          <form.Field name="statementBalance">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Statement Balance</Label>
                <Input
                  id={field.name}
                  type="number"
                  step="0.01"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Saldo akhir menurut rekening koran bank pada tanggal di atas.</p>
              </div>
            )}
          </form.Field>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Rekonsiliasi'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}