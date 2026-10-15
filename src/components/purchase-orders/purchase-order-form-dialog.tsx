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
import { Plus, Trash2 } from 'lucide-react'
import { useCreatePurchaseOrder, useUpdatePurchaseOrder } from '@/hooks/use-purchase-orders'
import { useSuppliers, useRecentSuppliers } from '@/hooks/use-suppliers'
import { useChartOfAccounts, useRecentChartOfAccounts } from '@/hooks/use-chart-of-accounts'
import { getApiErrorMessage } from '@/lib/errors'

const lineSchema = z.object({
  accountId: z.string().min(1, 'Pilih akun'),
  description: z.string(),
  qty: z.number().positive('Qty harus > 0'),
  unitPrice: z.number().min(0, 'Tidak boleh negatif'),
})

const orderSchema = z.object({
  supplierId: z.string().min(1, 'Pilih pemasok'),
  orderDate: z.string().min(1, 'Wajib diisi'),
  reference: z.string(),
  billingAddress: z.string(),
  description: z.string(),
  lines: z.array(lineSchema).min(1, 'Minimal 1 baris rincian'),
})

export interface PurchaseOrderForForm {
  id: string
  supplierId: string
  supplierName: string
  orderDate: string
  reference: string | null
  billingAddress: string | null
  description: string | null
  hasInvoices: boolean
  lines: { accountId: string; accountName: string; description: string | null; qty: string; unitPrice: string }[]
}

export type PurchaseOrderFormMode = 'create' | 'edit' | 'clone'

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



export function PurchaseOrderFormDialog({
  businessId,
  open,
  onOpenChange,
  order,
  mode,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: PurchaseOrderForForm | null
  mode: PurchaseOrderFormMode
}) {
  const createOrder = useCreatePurchaseOrder(businessId)
  const updateOrder = useUpdatePurchaseOrder(businessId)
  const { data: suppliersData } = useSuppliers(businessId, 1, 100)
  const suppliers = suppliersData?.data
  const { data: recentSuppliers } = useRecentSuppliers(businessId)
  const { data: accounts } = useChartOfAccounts(businessId)
  const { data: recentExpenseAccounts } = useRecentChartOfAccounts(businessId, 'Expense')
  const [serverError, setServerError] = useState<string | null>(null)

  const isEditing = mode === 'edit' && !!order
  // Aturan A: PO yang sudah punya faktur -> pemasok & rincian terkunci, header tetap bisa diubah.
  const isLocked = isEditing && order.hasInvoices

  const selectableSuppliers = (suppliers ?? []).filter((s) => s.isActive || s.id === order?.supplierId)
  const usedAccountIds = new Set(order?.lines.map((l) => l.accountId))
  const expenseAccounts = (accounts ?? []).filter(
    (a) => a.category === 'Expense' && (a.isActive || usedAccountIds.has(a.id)),
  )

  const emptyValues = {
    supplierId: '',
    orderDate: new Date().toISOString().slice(0, 10),
    reference: '',
    billingAddress: '',
    description: '',
    lines: [{ accountId: '', description: '', qty: 1, unitPrice: 0 }],
  }

  const form = useForm({
    defaultValues: emptyValues,
    validators: { onSubmit: orderSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const header = {
        orderDate: value.orderDate,
        reference: value.reference || undefined,
        billingAddress: value.billingAddress || undefined,
        description: value.description || undefined,
      }
      try {
        if (isLocked) {
          // Hanya header - backend menolak (409) kalau pemasok/rincian ikut dikirim.
          await updateOrder.mutateAsync({ purchaseOrderId: order.id, ...header })
        } else {
          const payload = {
            ...header,
            supplierId: value.supplierId,
            lines: value.lines.map((l) => ({
              accountId: l.accountId,
              description: l.description || undefined,
              qty: l.qty,
              unitPrice: l.unitPrice,
            })),
          }
          if (isEditing) {
            await updateOrder.mutateAsync({ purchaseOrderId: order.id, ...payload })
          } else {
            await createOrder.mutateAsync(payload)
          }
        }
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal menyimpan Purchase Order'))
      }
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        order
          ? {
              supplierId: order.supplierId,
              // Clone: tanggal hari ini & reference dikosongkan supaya tidak dobel.
              orderDate: mode === 'clone' ? emptyValues.orderDate : order.orderDate,
              reference: mode === 'clone' ? '' : (order.reference ?? ''),
              billingAddress: order.billingAddress ?? '',
              description: order.description ?? '',
              lines: order.lines.map((l) => ({
                accountId: l.accountId,
                description: l.description ?? '',
                qty: Number(l.qty),
                unitPrice: Number(l.unitPrice),
              })),
            }
          : emptyValues,
      )
      setServerError(null)
    }
  }, [open, order, mode])

  const title = isEditing ? 'Edit Purchase Order' : mode === 'clone' ? 'Clone Purchase Order' : 'Purchase Order Baru'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
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
          {isLocked && (
            <Alert>
              <AlertDescription>
                Pesanan ini sudah memiliki faktur, jadi pemasok dan rinciannya tidak bisa diubah. Tanggal, reference,
                alamat penagihan, dan deskripsi masih bisa diedit.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="orderDate">
              {(field) => (
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor={field.name}>Order Date</Label>
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

            <form.Field name="reference">
              {(field) => (
                <div className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor={field.name}>Reference (opsional)</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="PO/2026/10/001"
                  />
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="supplierId">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Supplier</Label>
                {isLocked ? (
                  <Input value={order.supplierName} disabled readOnly />
                ) : (
                  <Combobox
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v)}
                    recentOptions={(recentSuppliers ?? [])
                      .filter((s) => s.isActive || s.id === order?.supplierId)
                      .map((s) => ({ id: s.id, label: s.code ? `${s.code} - ${s.name}` : s.name }))}
                    searchOptions={selectableSuppliers.map((s) => ({
                      id: s.id,
                      label: s.code ? `${s.code} - ${s.name}` : s.name,
                    }))}
                    placeholder="Pilih pemasok"
                  />
                )}
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{errorText(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="billingAddress">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Billing Address (opsional)</Label>
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

          <div className="flex flex-col gap-2">
            <Label>Rincian</Label>

            {isLocked ? (
              <div className="rounded-md border">
                {order.lines.map((l, index) => (
                  <div key={index} className="flex items-center justify-between gap-2 border-b px-3 py-2 text-sm last:border-b-0">
                    <div className="min-w-0">
                      <p className="truncate">{l.description || l.accountName}</p>
                      <p className="text-xs text-muted-foreground">{l.accountName}</p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {Number(l.qty)} × {formatCurrency(Number(l.unitPrice))}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <form.Field name="lines" mode="array">
                {(linesField) => (
                  <div className="flex flex-col gap-3">
                    {linesField.state.value.map((_, index) => (
                      <div key={index} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
                        <form.Field name={`lines[${index}].accountId`}>
                          {(field) => (
                            <div className="flex min-w-45 flex-1 flex-col gap-2">
                              <Label>Account</Label>
                              <Combobox
                                value={field.state.value}
                                onValueChange={(v) => field.handleChange(v)}
                                recentOptions={(recentExpenseAccounts ?? [])
                                  .filter((a) => a.isActive || usedAccountIds.has(a.id))
                                  .map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))}
                                searchOptions={expenseAccounts.map((a) => ({ id: a.id, label: `${a.code} - ${a.name}` }))}
                                placeholder="Akun Expense"
                              />
                            </div>
                          )}
                        </form.Field>

                        <form.Field name={`lines[${index}].description`}>
                          {(field) => (
                            <div className="flex min-w-45 flex-1 flex-col gap-2">
                              <Label>Description</Label>
                              <Input
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                placeholder="Nama barang / jasa"
                              />
                            </div>
                          )}
                        </form.Field>

                        <form.Field name={`lines[${index}].qty`}>
                          {(field) => (
                            <div className="flex w-24 flex-col gap-2">
                              <Label>Qty</Label>
                              <Input
                                type="number"
                                min="0"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(Number(e.target.value))}
                              />
                            </div>
                          )}
                        </form.Field>

                        <form.Field name={`lines[${index}].unitPrice`}>
                          {(field) => (
                            <div className="flex w-36 flex-col gap-2">
                              <Label>Unit Price</Label>
                              <Input
                                type="number"
                                min="0"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(Number(e.target.value))}
                              />
                            </div>
                          )}
                        </form.Field>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          disabled={linesField.state.value.length <= 1}
                          onClick={() => linesField.removeValue(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => linesField.pushValue({ accountId: '', description: '', qty: 1, unitPrice: 0 })}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add Line
                    </Button>

                    {linesField.state.meta.errors.length > 0 && (
                      <p className="text-xs text-destructive">{errorText(linesField.state.meta.errors[0])}</p>
                    )}
                  </div>
                )}
              </form.Field>
            )}
          </div>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Purchase Order'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}