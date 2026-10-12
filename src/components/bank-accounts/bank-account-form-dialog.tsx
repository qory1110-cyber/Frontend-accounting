import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCreateBankAccount, useUpdateBankAccount } from '@/hooks/use-bank-accounts'
import { useChartOfAccounts, useRecentChartOfAccounts } from '@/hooks/use-chart-of-accounts'
import { getApiErrorMessage } from '@/lib/errors'

const bankAccountSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  code: z.string(),
  controlAccountId: z.string().min(1, 'Pilih Control Account'),
  accountNumber: z.string(),
  openingBalance: z.number(),
  openingBalanceDate: z.string(),
  canHavePendingTransactions: z.boolean(),
  creditLimit: z.number().min(0, 'Tidak boleh negatif'),
})

interface EditingBankAccount {
  id: string
  name: string
  code: string | null
  controlAccountId: string
  accountNumber: string | null
  openingBalance: string
  openingBalanceDate: string | null
  canHavePendingTransactions: boolean
  creditLimit: string
}

export function BankAccountFormDialog({
  businessId,
  open,
  onOpenChange,
  editingBankAccount,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editingBankAccount?: EditingBankAccount | null
}) {
  const createBankAccount = useCreateBankAccount(businessId)
  const updateBankAccount = useUpdateBankAccount(businessId)
  const { data: accounts } = useChartOfAccounts(businessId)
  const { data: recentAssetAccounts } = useRecentChartOfAccounts(businessId, 'Asset')
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!editingBankAccount

  // §4.4 aturan #1: Control Account harus tipe Asset. Tetap tampilkan
  // Control Account yang SEDANG dipakai akun ini sendiri saat edit (supaya
  // tidak "hilang" dari pilihan cuma karena sudah terpakai olehnya sendiri).
  const assetAccounts = (accounts ?? []).filter(
    (a) => a.category === 'Asset' && (a.isActive || a.id === editingBankAccount?.controlAccountId),
  )

  const emptyValues = {
    name: '',
    code: '',
    controlAccountId: '',
    accountNumber: '',
    openingBalance: 0,
    openingBalanceDate: '',
    canHavePendingTransactions: true,
    creditLimit: 0,
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: bankAccountSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const payload = {
        ...value,
        code: value.code || undefined,
        accountNumber: value.accountNumber || undefined,
        openingBalanceDate: value.openingBalanceDate || undefined,
      }
      try {
        if (isEditing) {
          await updateBankAccount.mutateAsync({ bankAccountId: editingBankAccount.id, ...payload })
        } else {
          await createBankAccount.mutateAsync(payload)
        }
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, isEditing ? 'Gagal menyimpan perubahan' : 'Gagal membuat akun'))
      }
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        editingBankAccount
          ? {
              name: editingBankAccount.name,
              code: editingBankAccount.code ?? '',
              controlAccountId: editingBankAccount.controlAccountId,
              accountNumber: editingBankAccount.accountNumber ?? '',
              openingBalance: Number(editingBankAccount.openingBalance),
              openingBalanceDate: editingBankAccount.openingBalanceDate ?? '',
              canHavePendingTransactions: editingBankAccount.canHavePendingTransactions,
              creditLimit: Number(editingBankAccount.creditLimit),
            }
          : emptyValues,
      )
      setServerError(null)
    }
  }, [open, editingBankAccount])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Akun Bank/Kas' : 'Akun Bank/Kas Baru'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col gap-4"
        >
          <form.Field name="name">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Nama</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Bank BCA - Utama"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="code">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Code (opsional)</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="1-10001"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="controlAccountId">
  {(field) => (
    <div className="flex flex-col gap-2">
      <Label>Control Account</Label>
      <Combobox
        value={field.state.value}
        onValueChange={(v) => field.handleChange(v)}
        recentOptions={(recentAssetAccounts ?? [])
          .filter((a) => a.isActive || a.id === editingBankAccount?.controlAccountId)
          .map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))}
        searchOptions={assetAccounts.map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))}
        placeholder="Pilih akun Asset di Chart of Accounts"
      />
      {assetAccounts.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Tidak ada akun bertipe Asset di Chart of Accounts.
        </p>
      )}
      {field.state.meta.errors.length > 0 && (
        <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
      )}
    </div>
  )}
</form.Field>

          <form.Field name="accountNumber">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>IBAN (opsional, kosongkan untuk akun kas)</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="131-0620595"
                />
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="openingBalance">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Opening Balance</Label>
                  <Input
                    id={field.name}
                    type="number"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="openingBalanceDate">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Tanggal Opening Balance</Label>
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

          <form.Field name="creditLimit">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Credit Limit (opsional)</Label>
                <Input
                  id={field.name}
                  type="number"
                  min="0"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="canHavePendingTransactions">
            {(field) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked === true)}
                />
                <Label htmlFor={field.name} className="font-normal">
                  Can have pending transactions
                </Label>
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
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan' : 'Buat Akun'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}