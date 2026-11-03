import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Combobox } from '@/components/ui/combobox'
import { useCreateLatePaymentFee, useUpdateLatePaymentFee } from '@/hooks/use-late-payment-fees'
import { useCustomers, useRecentCustomers } from '@/hooks/use-customers'
import { useSalesInvoices } from '@/hooks/use-sales-invoices'
import { getApiErrorMessage } from '@/lib/errors'

const feeSchema = z.object({
  customerId: z.string().min(1, 'Pilih pelanggan'),
  salesInvoiceId: z.string().min(1, 'Pilih faktur'),
  feeDate: z.string().min(1, 'Wajib diisi'),
  amount: z.number().positive('Nominal harus > 0'),
})

export interface LatePaymentFeeForForm {
  id: string
  customerId: string
  customerName: string
  salesInvoiceId: string
  salesInvoiceReference: string | null
  salesInvoiceDate: string
  feeDate: string
  amount: number
}

export type LatePaymentFeeFormMode = 'create' | 'edit'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

// Error validasi dari schema berupa objek { message }, bukan string biasa.
function errorText(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Input tidak valid'
}

export function LatePaymentFeeFormDialog({
  businessId,
  open,
  onOpenChange,
  fee,
  mode,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  fee?: LatePaymentFeeForForm | null
  mode: LatePaymentFeeFormMode
}) {
  const createFee = useCreateLatePaymentFee(businessId)
  const updateFee = useUpdateLatePaymentFee(businessId)
  const { data: customersData } = useCustomers(businessId, 1, 100)
  const customers = customersData?.data ?? []
  const { data: recentCustomers } = useRecentCustomers(businessId)
  const { data: invoicesData } = useSalesInvoices(businessId, 1, 100)
  const invoices = invoicesData?.data ?? []
  const [serverError, setServerError] = useState<string | null>(null)

  const isEditing = mode === 'edit' && !!fee

  const selectableCustomers = customers.filter((c) => c.isActive || c.id === fee?.customerId)

  const emptyValues = {
    customerId: '',
    salesInvoiceId: '',
    feeDate: new Date().toISOString().slice(0, 10),
    amount: 0,
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: feeSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        if (isEditing) {
          // Kirim pelanggan/faktur hanya bila diganti, supaya ubah nominal atau tanggal tidak
          // terhalang status pelanggan atau faktur yang sudah berubah.
          await updateFee.mutateAsync({
            latePaymentFeeId: fee.id,
            feeDate: value.feeDate,
            amount: value.amount,
            ...(value.customerId !== fee.customerId && { customerId: value.customerId }),
            ...(value.salesInvoiceId !== fee.salesInvoiceId && { salesInvoiceId: value.salesInvoiceId }),
          })
        } else {
          await createFee.mutateAsync({
            customerId: value.customerId,
            salesInvoiceId: value.salesInvoiceId,
            feeDate: value.feeDate,
            amount: value.amount,
          })
        }
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal menyimpan Late Payment Fee'))
      }
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        fee
          ? {
              customerId: fee.customerId,
              salesInvoiceId: fee.salesInvoiceId,
              feeDate: fee.feeDate,
              amount: fee.amount,
            }
          : emptyValues,
      )
      setServerError(null)
    }
  }, [open, fee, mode])

  const title = isEditing ? 'Edit Late Payment Fee' : 'Late Payment Fee Baru'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-lg">
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
          <form.Field name="feeDate">
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
                  onValueChange={(v) => {
                    field.handleChange(v)
                    // Faktur harus milik pelanggan yang dipilih, jadi pilihan faktur dikosongkan saat pelanggan berganti.
                    if (v !== field.state.value) form.setFieldValue('salesInvoiceId', '')
                  }}
                  recentOptions={(recentCustomers ?? [])
                    .filter((c) => c.isActive || c.id === fee?.customerId)
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

          <form.Subscribe selector={(state) => state.values.customerId}>
            {(customerId) => {
              // Hanya faktur 'sent' milik pelanggan terpilih (plus faktur yang sudah tersimpan saat edit).
              const invoiceOptions = invoices
                .filter(
                  (inv) =>
                    inv.customerId === customerId &&
                    (inv.status === 'sent' || inv.id === fee?.salesInvoiceId),
                )
                .map((inv) => ({
                  id: inv.id,
                  label: `${inv.reference || 'Tanpa referensi'} · ${inv.issueDate} · ${formatCurrency(inv.invoiceAmount)}`,
                }))
              return (
                <form.Field name="salesInvoiceId">
                  {(field) => (
                    <div className="flex flex-col gap-2">
                      <Label>Sales Invoice</Label>
                      <Combobox
                        value={field.state.value}
                        onValueChange={(v) => field.handleChange(v)}
                        recentOptions={invoiceOptions}
                        searchOptions={invoiceOptions}
                        placeholder={customerId ? 'Pilih faktur' : 'Pilih pelanggan terlebih dahulu'}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-xs text-destructive">{errorText(field.state.meta.errors[0])}</p>
                      )}
                    </div>
                  )}
                </form.Field>
              )
            }}
          </form.Subscribe>

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

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Late Payment Fee'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}