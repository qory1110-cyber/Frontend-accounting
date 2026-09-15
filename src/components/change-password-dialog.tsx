import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useChangePassword } from '@/hooks/use-auth'
import { getApiErrorMessage } from '@/lib/errors'

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Wajib diisi'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
})

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const changePassword = useChangePassword()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm({
    defaultValues: { oldPassword: '', newPassword: '' },
    validators: { onSubmit: changePasswordSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await changePassword.mutateAsync(value)
        setSuccess(true)
        form.reset()
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal mengganti password'))
      }
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) setSuccess(false)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ganti Password</DialogTitle>
        </DialogHeader>

        {success ? (
          <Alert>
            <AlertDescription>Password berhasil diganti. Sesi lain kamu otomatis keluar.</AlertDescription>
          </Alert>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="flex flex-col gap-4"
          >
            <form.Field name="oldPassword">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Password lama</Label>
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

            <form.Field name="newPassword">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>Password baru</Label>
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

            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}