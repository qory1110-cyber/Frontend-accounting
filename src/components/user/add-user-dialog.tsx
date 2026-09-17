import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateUser } from '@/hooks/use-users'
import { useBusinessesList } from '@/hooks/use-businesses'
import { getApiErrorMessage } from '@/lib/errors'

type Role = 'admin' | 'accountant' | 'viewer'   // <- baris baru ini

const addUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  businessId: z.string().min(1, 'Pilih bisnis'),
  role: z.enum(['admin', 'accountant', 'viewer']),
})

export function AddUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createUser = useCreateUser()
  const { data: businesses } = useBusinessesList()
  const [serverError, setServerError] = useState<string | null>(null)

  // Cuma bisnis yang kamu admin di situ yang boleh dipilih -
  // sejalan dengan aturan keamanan di backend (403 kalau bukan admin).
  const adminBusinesses = (businesses ?? []).filter((b) => b.role === 'admin')

  const form = useForm({
    defaultValues: { name: '', email: '', password: '', businessId: '', role: 'viewer' as Role },
    validators: { onSubmit: addUserSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await createUser.mutateAsync({
  name: value.name,
  email: value.email,
  password: value.password,
  assignments: [{ businessId: value.businessId, role: value.role }],
})
        form.reset()
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal menambah user'))
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah User</DialogTitle>
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
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  type="email"
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

          <form.Field name="password">
  {(field) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={field.name}>Password</Label>
      <Input
        id={field.name}
        type="password"
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

          <form.Field name="businessId">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Bisnis</Label>
                <Select value={field.state.value} onValueChange={(value) => field.handleChange(value ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bisnis" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminBusinesses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {adminBusinesses.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Kamu belum jadi admin di bisnis manapun.
                  </p>
                )}
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="role">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Role</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v as 'admin' | 'accountant' | 'viewer')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
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
                <Button type="submit" disabled={isSubmitting || adminBusinesses.length === 0}>
                  {isSubmitting ? 'Menyimpan...' : 'Tambah User'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}