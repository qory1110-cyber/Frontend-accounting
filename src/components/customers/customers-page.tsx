import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2, Users, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCustomers, useSetCustomerActive } from '@/hooks/use-customers'
import { useBusiness } from '@/hooks/use-businesses'
import { CustomerFormDialog } from './customer-form-dialog'
import { DeleteCustomerDialog } from './delete-customer-dialog'
import { CustomerViewDialog } from './customer-view-dialog'

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

const PAGE_SIZE = 10
// Saat pencarian aktif, ambil jumlah besar supaya pencarian menjangkau semua
// data, bukan cuma halaman yang sedang dimuat. Bukan "tanpa batas", tapi
// cukup besar untuk skala data wajar satu bisnis.
const SEARCH_PAGE_SIZE = 100

export function CustomersPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const isSearching = search.trim().length > 0
  const { data: customersData, isLoading } = useCustomers(
    businessId,
    isSearching ? 1 : page,
    isSearching ? SEARCH_PAGE_SIZE : PAGE_SIZE,
  )
  const customers = customersData?.data ?? []
  const pagination = customersData?.pagination
    // Kalau halaman yang sedang dibuka jadi kosong (misalnya data terakhirnya
  // dihapus), mundur ke halaman terakhir yang masih ada.
  useEffect(() => {
    if (pagination && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const setActive = useSetCustomerActive(businessId)

  const [formOpen, setFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<{ id: string; name: string } | null>(null)

  const isAdmin = business?.role === 'admin'

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.code ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

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
        onChange={(e) => handleSearchChange(e.target.value)}
        className="mb-4"
      />

      {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-10 text-center">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada pelanggan.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="rounded-lg border bg-background">
          {filtered.map((customer) => (
            <div
              key={customer.id}
              className="flex flex-wrap items-center justify-between gap-y-2 border-b px-4 py-3 last:border-b-0"
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

              <div className="flex shrink-0 items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingCustomer(customer)} title="View">
                  <Eye className="h-4 w-4" />
                </Button>

                {isAdmin && (
                  <>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={customer.isActive}
                        onCheckedChange={(checked) => setActive.mutate({ customerId: customer.id, isActive: checked })}
                      />
                      <span className="text-xs text-muted-foreground">{customer.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
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
                  </>
                )}
              </div>
            </div>
          ))}

          {!isSearching && pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
              <span>
                Halaman {pagination.currentPage} dari {pagination.totalPages} · {pagination.total} pelanggan
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

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
      <CustomerViewDialog
        open={!!viewingCustomer}
        onOpenChange={(open) => !open && setViewingCustomer(null)}
        customer={viewingCustomer}
      />
    </div>
  )
}