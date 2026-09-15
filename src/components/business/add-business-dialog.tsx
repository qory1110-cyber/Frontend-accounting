import { useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCreateBusiness } from '@/hooks/use-businesses'
import { getApiErrorMessage } from '@/lib/errors'

const businessSchema = z.object({
  name: z.string().min(1, 'Nama bisnis wajib diisi'),
})

export function AddBusinessDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const createBusiness = useCreateBusiness()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { name: '' },
    validators: { onSubmit: businessSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        const business = await createBusiness.mutateAsync({ name: value.name, baseCurrencyCode: 'IDR' })
        form.reset()
        onOpenChange(false)
        navigate({ to: '/businesses/$businessId', params: { businessId: business.id } })
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal membuat bisnis'))
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bisnis Baru</DialogTitle>
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
                <Label htmlFor={field.name}>Nama Bisnis</Label>
                <Input
                  id={field.name}
                  placeholder="Toko Budi Jaya"
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
                  {isSubmitting ? 'Membuat...' : 'Buat Bisnis'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}