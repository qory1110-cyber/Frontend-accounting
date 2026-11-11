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
import { useCreateBillableTime, useUpdateBillableTime } from '@/hooks/use-billable-times'
import { useCustomers, useRecentCustomers } from '@/hooks/use-customers'
import { getApiErrorMessage } from '@/lib/errors'

const timeSchema = z.object({
  workDate: z.string().min(1, 'Wajib diisi'),
  customerId: z.string(),
  description: z.string(),
  hourlyRate: z.number().min(0, 'Tidak boleh negatif'),
  hours: z.number().int('Harus bilangan bulat').min(0, 'Tidak boleh negatif'),
  minutes: z.number().int('Harus bilangan bulat').min(0, 'Tidak boleh negatif'),
  writeOff: z.boolean(),
  writtenOffDate: z.string(),
})

export interface BillableTimeForForm {
  id: string
  customerId: string | null
  workDate: string
  description: string | null
  hourlyRate: number
  hours: number
  minutes: number
}

export type BillableTimeFormMode = 'create' | 'edit' | 'clone'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

// Sama dengan perhitungan di backend: tarif x (jam + menit/60), dibulatkan 2 desimal.
function computeAmount(rate: number, hours: number, minutes: number) {
  return Math.round((rate * (hours + minutes / 60) + Number.EPSILON) * 100) / 100
}

// Error validasi dari schema berupa objek { message }, bukan string biasa.
function errorText(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Input tidak valid'
}

export function BillableTimeFormDialog({
  businessId,
  open,
  onOpenChange,
  item,
  mode,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: BillableTimeForForm | null
  mode: BillableTimeFormMode
}) {
  const createItem = useCreateBillableTime(businessId)
  const updateItem = useUpdateBillableTime(businessId)
  const { data: customersData } = useCustomers(businessId, 1, 100)
  const customers = customersData?.data ?? []
  const { data: recentCustomers } = useRecentCustomers(businessId)
  const [serverError, setServerError] = useState<string | null>(null)

  const isEditing = mode === 'edit' && !!item

  const selectableCustomers = customers.filter((c) => c.isActive || c.id === item?.customerId)

  const today = new Date().toISOString().slice(0, 10)
  const emptyValues = {
    workDate: today,
    customerId: '',
    description: '',
    hourlyRate: 0,
    hours: 0,
    minutes: 0,
    writeOff: false,
    writtenOffDate: today,
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: timeSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        if (isEditing) {
          // Edit: customer & deskripsi yang dikosongkan dikirim null supaya benar-benar terhapus.
          await updateItem.mutateAsync({
            billableTimeId: item.id,
            workDate: value.workDate,
            customerId: value.customerId || null,
            description: value.description || null,
            hourlyRate: value.hourlyRate,
            hours: value.hours,
            minutes: value.minutes,
            ...(value.writeOff ? { status: 'written_off' as const, writtenOffDate: value.writtenOffDate } : {}),
          })
        } else {
          await createItem.mutateAsync({
            workDate: value.workDate,
            customerId: value.customerId || undefined,
            description: value.description || undefined,
            hourlyRate: value.hourlyRate,
            hours: value.hours,
            minutes: value.minutes,
          })
        }
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal menyimpan Billable Time'))
      }
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        item
          ? {
              // Clone: tanggal hari ini supaya tidak terkunci di tanggal lama.
              workDate: mode === 'clone' ? today : item.workDate,
              customerId: item.customerId ?? '',
              description: item.description ?? '',
              hourlyRate: item.hourlyRate,
              hours: item.hours,
              minutes: item.minutes,
              writeOff: false,
              writtenOffDate: today,
            }
          : emptyValues,
      )
      setServerError(null)
    }
  }, [open, item, mode])

  const title = isEditing ? 'Edit Billable Time' : mode === 'clone' ? 'Clone Billable Time' : 'Billable Time Baru'

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
          <form.Field name="workDate">
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
                <div className="flex items-center justify-between">
                  <Label>Customer (opsional)</Label>
                  {field.state.value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => field.handleChange('')}
                    >
                      Kosongkan
                    </Button>
                  )}
                </div>
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

          <div className="grid grid-cols-3 gap-4">
            <form.Field name="hourlyRate">
              {(field) => (
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor={field.name}>Hourly Rate</Label>
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

            <form.Field name="hours">
              {(field) => (
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor={field.name}>Hours</Label>
                  <Input
                    id={field.name}
                    type="number"
                    min="0"
                    step="1"
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

            <form.Field name="minutes">
              {(field) => (
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor={field.name}>Minutes</Label>
                  <Input
                    id={field.name}
                    type="number"
                    min="0"
                    step="1"
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
          </div>

          <form.Subscribe selector={(state) => state.values}>
            {(values) => (
              <p className="text-sm text-muted-foreground">
                Amount:{' '}
                <span className="font-medium text-foreground">
                  {formatCurrency(computeAmount(values.hourlyRate, values.hours, values.minutes))}
                </span>
              </p>
            )}
          </form.Subscribe>

          {isEditing && (
            <div className="flex flex-col gap-3 rounded-md border p-3">
              <form.Field name="writeOff">
                {(field) => (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.state.value}
                      onChange={(e) => field.handleChange(e.target.checked)}
                    />
                    Tandai sebagai Written-off (dihapuskan, tidak akan ditagih)
                  </label>
                )}
              </form.Field>

              <form.Subscribe selector={(state) => state.values.writeOff}>
                {(writeOff) =>
                  writeOff && (
                    <form.Field name="writtenOffDate">
                      {(field) => (
                        <div className="flex flex-col gap-2">
                          <Label htmlFor={field.name}>Tanggal Written-off</Label>
                          <Input
                            id={field.name}
                            type="date"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                        </div>
                      )}
                    </form.Field>
                  )
                }
              </form.Subscribe>
            </div>
          )}

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Billable Time'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}