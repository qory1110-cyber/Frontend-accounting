import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useMe, useUpdateMe } from '@/hooks/use-auth'
import { getApiErrorMessage } from '@/lib/errors'

export const Route = createFileRoute('/user')({
  component: UserPage,
})

const updateNameSchema = z.object({
  name: z.string().min(1, 'Nama tidak boleh kosong'),
})

function UserPage() {
  const { data: user, isLoading, isError } = useMe()
  const updateMe = useUpdateMe()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm({
    defaultValues: { name: '' },
    validators: { onSubmit: updateNameSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      setSuccess(false)
      try {
        await updateMe.mutateAsync(value)
        setSuccess(true)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal menyimpan perubahan'))
      }
    },
  })

  // Begitu data user selesai dimuat (atau berubah), "susulkan" ke form -
  // defaultValues di useForm cuma dibaca SEKALI saat form pertama dibuat.
  useEffect(() => {
    if (user) {
      form.reset({ name: user.name })
    }
  }, [user])

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 text-lg font-semibold">Profil Saya</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Diri</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {isError && (
            <p className="text-sm text-destructive">
              Gagal memuat data profil. Coba muat ulang halaman.
            </p>
          )}

          {user && (
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
                      <p className="text-xs text-destructive">
                        {String(field.state.meta.errors[0])}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <div className="flex flex-col gap-2">
                <Label>Email</Label>
                <Input value={user.email} disabled />
              </div>

              {serverError && (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>Perubahan berhasil disimpan.</AlertDescription>
                </Alert>
              )}

              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting} className="w-fit">
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}