import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateChartOfAccount, useUpdateChartOfAccount, type AccountCategory } from '@/hooks/use-chart-of-accounts'
import { getApiErrorMessage } from '@/lib/errors'

const accountSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi'),
  name: z.string().min(1, 'Nama wajib diisi'),
  category: z.enum(['Asset', 'Liability', 'Equity', 'Income', 'Expense']),
})

interface EditingAccount {
  id: string
  code: string
  name: string
  category: AccountCategory
}

export function AccountFormDialog({
  businessId,
  open,
  onOpenChange,
  editingAccount,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editingAccount?: EditingAccount | null
}) {
  const createAccount = useCreateChartOfAccount(businessId)
  const updateAccount = useUpdateChartOfAccount(businessId)
  const [serverError, setServerError] = useState<string | null>(null)
  const isEditing = !!editingAccount

  const form = useForm({
    defaultValues: { code: '', name: '', category: 'Asset' as AccountCategory },
    validators: { onSubmit: accountSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        if (isEditing) {
          await updateAccount.mutateAsync({ accountId: editingAccount.id, ...value })
        } else {
          await createAccount.mutateAsync(value)
        }
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, isEditing ? 'Gagal menyimpan perubahan' : 'Gagal membuat akun'))
      }
    },
  })

  // Sinkronkan form saat mode edit dibuka dengan data akun yang berbeda-beda
  useEffect(() => {
    if (open) {
      form.reset(
        editingAccount
          ? { code: editingAccount.code, name: editingAccount.name, category: editingAccount.category }
          : { code: '', name: '', category: 'Asset' },
      )
      setServerError(null)
    }
  }, [open, editingAccount])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Akun' : 'Akun Baru'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col gap-4"
        >
          <form.Field name="code">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Kode</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="4000"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="name">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Nama</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Pendapatan Jasa"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="category">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Kategori</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange((v ?? 'Asset') as AccountCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asset">Asset</SelectItem>
                    <SelectItem value="Liability">Liability</SelectItem>
                    <SelectItem value="Equity">Equity</SelectItem>
                    <SelectItem value="Income">Income</SelectItem>
                    <SelectItem value="Expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
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