import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { useCustomers, useSetCustomerActive } from '@/hooks/use-customers'
import { useBusiness } from '@/hooks/use-businesses'
import { CustomerFormDialog } from './customer-form-dialog'
import { DeleteCustomerDialog } from './delete-customer-dialog'

interface Customer {
  id: string
  name: string
  code: string | null
  creditLimit: string
  billingAddress: string | null
  deliveryAddress: string | null
  email: string | null
  autofillSalesInvoiceDueDate: boolean
  isActive: boolean
  accountsReceivable: number
}

export function CustomersPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)
  const { data: customers, isLoading } = useCustomers(businessId)
  const setActive = useSetCustomerActive(businessId)

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<{ id: string; name: string } | null>(null)

  const isAdmin = business?.role === 'admin'

  const filtered = (customers ?? []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.code ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  function openCreate() {
    setEditingCustomer(null)
    setFormOpen(true)
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer)
    setFormOpen(true)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Customers</h1>
        {isAdmin && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Customer
          </Button>
        )}
      </div>

      <Input
        placeholder="Cari nama atau kode..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada pelanggan.</p>
        </div>
      )}

      <div className="rounded-lg border bg-background">
        {filtered.map((customer) => (
          <div
            key={customer.id}
            className="flex items-center justify-between border-b px-4 py-3 last:border-b-0"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${!customer.isActive ? 'text-muted-foreground line-through' : ''}`}>
                  {customer.name}
                </span>
                {customer.code && (
                  <Badge variant="outline" className="font-mono font-normal">
                    {customer.code}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Credit Limit: {Number(customer.creditLimit).toLocaleString('id-ID')} · AR:{' '}
                {customer.accountsReceivable.toLocaleString('id-ID')}
              </p>
            </div>

            {isAdmin && (
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  checked={customer.isActive}
                  onCheckedChange={(checked) => setActive.mutate({ customerId: customer.id, isActive: checked })}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(customer)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeletingCustomer({ id: customer.id, name: customer.name })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <CustomerFormDialog
        businessId={businessId}
        open={formOpen}
        onOpenChange={setFormOpen}
        editingCustomer={editingCustomer}
      />
      <DeleteCustomerDialog
        businessId={businessId}
        open={!!deletingCustomer}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        customer={deletingCustomer}
      />
    </div>
  )
}