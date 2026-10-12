import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Combobox } from '@/components/ui/combobox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCreateInterAccountTransfer } from '@/hooks/use-inter-account-transfers'
import { useBankAccounts, useRecentBankAccounts } from '@/hooks/use-bank-accounts'
import { getApiErrorMessage } from '@/lib/errors'
import { formatValidationIssues } from '@/lib/format-validation-issues'

const transferSchema = z
  .object({
    transferDate: z.string().min(1, 'Wajib diisi'),
    reference: z.string(),
    description: z.string(),
    paidFromBankAccountId: z.string().min(1, 'Pilih akun asal'),
    receivedInBankAccountId: z.string().min(1, 'Pilih akun tujuan'),
    amount: z.number().positive('Jumlah harus > 0'),
  })
    .refine(
    (v) =>
      !v.paidFromBankAccountId ||
      !v.receivedInBankAccountId ||
      v.paidFromBankAccountId !== v.receivedInBankAccountId,
    {
      message: 'Akun asal dan tujuan harus berbeda',
      path: ['receivedInBankAccountId'],
    },
  )

export function TransferFormDialog({
  businessId,
  open,
  onOpenChange,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createTransfer = useCreateInterAccountTransfer(businessId)
  const { data: bankAccountsData } = useBankAccounts(businessId, 1, 100)
  const bankAccounts = bankAccountsData?.data
  const { data: recentBankAccounts } = useRecentBankAccounts(businessId)
  const [serverError, setServerError] = useState<string | null>(null)

  const activeBankAccounts = (bankAccounts ?? []).filter((a) => a.isActive)
  const recentOptions = (recentBankAccounts ?? [])
    .filter((a) => a.isActive)
    .map((a) => ({ id: a.id, label: a.code ? `${a.code} - ${a.name}` : a.name }))
  const searchOptions = activeBankAccounts.map((a) => ({
    id: a.id,
    label: a.code ? `${a.code} - ${a.name}` : a.name,
  }))

  const emptyValues = {
    transferDate: new Date().toISOString().slice(0, 10),
    reference: '',
    description: '',
    paidFromBankAccountId: '',
    receivedInBankAccountId: '',
    amount: 0,
  }

  const form = useForm({
    defaultValues: emptyValues,
    // Validasi sengaja di dalam onSubmit (bukan validators) supaya tidak ada
    // status error yang tersangkut di form, seperti yang pernah terjadi di Payments.
    onSubmit: async ({ value }) => {
      setServerError(null)
      const result = transferSchema.safeParse(value)
      if (!result.success) {
        setServerError(formatValidationIssues(result.error.issues))
        return
      }
      const payload = {
        transferDate: value.transferDate,
        reference: value.reference || undefined,
        description: value.description || undefined,
        paidFromBankAccountId: value.paidFromBankAccountId,
        receivedInBankAccountId: value.receivedInBankAccountId,
        amount: value.amount,
      }
      try {
        await createTransfer.mutateAsync(payload)
        form.reset(emptyValues)
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal membuat transfer'))
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
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer Antar Akun Baru</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex min-w-0 flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="transferDate">
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

          <form.Field name="paidFromBankAccountId">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Paid from</Label>
                <Combobox
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                  recentOptions={recentOptions}
                  searchOptions={searchOptions}
                  placeholder="Pilih akun asal"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="receivedInBankAccountId">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Received in</Label>
                <Combobox
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                  recentOptions={recentOptions}
                  searchOptions={searchOptions}
                  placeholder="Pilih akun tujuan"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="amount">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Amount</Label>
                <Input
                  id={field.name}
                  type="number"
                  min="0"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
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

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Buat Transfer'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}