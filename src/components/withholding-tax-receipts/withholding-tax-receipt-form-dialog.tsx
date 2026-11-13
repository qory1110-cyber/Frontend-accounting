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
import {
  useCreateWithholdingTaxReceipt,
  useUpdateWithholdingTaxReceipt,
} from '@/hooks/use-withholding-tax-receipts'
import { useCustomers, useRecentCustomers } from '@/hooks/use-customers'
import { getApiErrorMessage } from '@/lib/errors'

const receiptSchema = z.object({
  receiptDate: z.string().min(1, 'Wajib diisi'),
  customerId: z.string().min(1, 'Pilih pelanggan'),
  amount: z.number().positive('Jumlah harus lebih dari 0'),
  description: z.string(),
})

export interface WithholdingTaxReceiptForForm {
  id: string
  customerId: string
  receiptDate: string
  amount: number
  description: string | null
}

export type WithholdingTaxReceiptFormMode = 'create' | 'edit' | 'clone'

// Error validasi dari schema berupa objek { message }, bukan string biasa.
function errorText(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Input tidak valid'
}

export function WithholdingTaxReceiptFormDialog({
  businessId,
  open,
  onOpenChange,
  item,
  mode,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: WithholdingTaxReceiptForForm | null
  mode: WithholdingTaxReceiptFormMode
}) {
  const createItem = useCreateWithholdingTaxReceipt(businessId)
  const updateItem = useUpdateWithholdingTaxReceipt(businessId)
  const { data: customersData } = useCustomers(businessId, 1, 100)
  const customers = customersData?.data ?? []
  const { data: recentCustomers } = useRecentCustomers(businessId)
  const [serverError, setServerError] = useState<string | null>(null)

  const isEditing = mode === 'edit' && !!item

  const selectableCustomers = customers.filter((c) => c.isActive || c.id === item?.customerId)

  const today = new Date().toISOString().slice(0, 10)
  const emptyValues = {
    receiptDate: today,
    customerId: '',
    amount: 0,
    description: '',
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: receiptSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        if (isEditing) {
          // Edit: deskripsi yang dikosongkan dikirim null supaya benar-benar terhapus.
          await updateItem.mutateAsync({
            withholdingTaxReceiptId: item.id,
            receiptDate: value.receiptDate,
            customerId: value.customerId,
            amount: value.amount,
            description: value.description || null,
          })
        } else {
          await createItem.mutateAsync({
            receiptDate: value.receiptDate,
            customerId: value.customerId,
            amount: value.amount,
            description: value.description || undefined,
          })
        }
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal menyimpan Withholding Tax Receipt'))
      }
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        item
          ? {
              // Clone: tanggal hari ini supaya tidak terkunci di tanggal lama.
              receiptDate: mode === 'clone' ? today : item.receiptDate,
              customerId: item.customerId,
              amount: item.amount,
              description: item.description ?? '',
            }
          : emptyValues,
      )
      setServerError(null)
    }
  }, [open, item, mode])

  const title = isEditing
    ? 'Edit Withholding Tax Receipt'
    : mode === 'clone'
      ? 'Clone Withholding Tax Receipt'
      : 'Withholding Tax Receipt Baru'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-xl">
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
          <form.Field name="receiptDate">
            {(field) => (
              <div className="flex flex-col gap-2">
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

          <form.Field name="customerId">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Customer</Label>
                <Combobox
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                  recentOptions={(recentCustomers ?? [])
                    .filter((c) => c.isActive || c.id === item?.customerId)
                    .map((c) => ({ id: c.id, label: c.code ? `${c.code} - ${c.name}` : c.name }))}
                  searchOptions={selectableCustomers.map((c) => ({
                    id: c.id,
                    label: c.code ? `${c.code} - ${c.name}` : c.name,
                  }))}
                  placeholder="Pilih pelanggan"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{errorText(field.state.meta.errors[0])}</p>
                )}
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
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{errorText(field.state.meta.errors[0])}</p>
                )}
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
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Withholding Tax Receipt'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}