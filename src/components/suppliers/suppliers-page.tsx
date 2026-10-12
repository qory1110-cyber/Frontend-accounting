import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2, Truck, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSuppliers, useSetSupplierActive } from '@/hooks/use-suppliers'
import { useBusiness } from '@/hooks/use-businesses'
import { SupplierFormDialog } from './supplier-form-dialog'
import { DeleteSupplierDialog } from './delete-supplier-dialog'
import { SupplierViewDialog } from './supplier-view-dialog'

interface Supplier {
  id: string
  name: string
  code: string | null
  creditLimit: string
  address: string | null
  email: string | null
  isActive: boolean
  accountsPayable: number
}

const PAGE_SIZE = 10
const SEARCH_PAGE_SIZE = 100

export function SuppliersPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const isSearching = search.trim().length > 0
  const { data: suppliersData, isLoading } = useSuppliers(
    businessId,
    isSearching ? 1 : page,
    isSearching ? SEARCH_PAGE_SIZE : PAGE_SIZE,
  )
  const suppliers = suppliersData?.data ?? []
  const pagination = suppliersData?.pagination
    // Kalau halaman yang sedang dibuka jadi kosong (misalnya data terakhirnya
  // dihapus), mundur ke halaman terakhir yang masih ada.
  useEffect(() => {
    if (pagination && page > pagination.totalPages) setPage(pagination.totalPages)
  }, [pagination, page])

  const setActive = useSetSupplierActive(businessId)

  const [formOpen, setFormOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<{ id: string; name: string } | null>(null)

  const isAdmin = business?.role === 'admin'

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.code ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function openCreate() {
    setEditingSupplier(null)
    setFormOpen(true)
  }

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier)
    setFormOpen(true)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Suppliers</h1>
        {isAdmin && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Supplier
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
          <Truck className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada pemasok.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="rounded-lg border bg-background">
          {filtered.map((supplier) => (
            <div
              key={supplier.id}
              className="flex flex-wrap items-center justify-between gap-y-2 border-b px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${!supplier.isActive ? 'text-muted-foreground line-through' : ''}`}>
                    {supplier.name}
                  </span>
                  {supplier.code && (
                    <Badge variant="outline" className="font-mono font-normal">
                      {supplier.code}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Credit Limit: {Number(supplier.creditLimit).toLocaleString('id-ID')} · AP:{' '}
                  {supplier.accountsPayable.toLocaleString('id-ID')}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingSupplier(supplier)} title="View">
                  <Eye className="h-4 w-4" />
                </Button>

                {isAdmin && (
                  <>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={supplier.isActive}
                        onCheckedChange={(checked) => setActive.mutate({ supplierId: supplier.id, isActive: checked })}
                      />
                      <span className="text-xs text-muted-foreground">{supplier.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(supplier)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingSupplier({ id: supplier.id, name: supplier.name })}
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
                Halaman {pagination.currentPage} dari {pagination.totalPages} · {pagination.total} pemasok
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

      <SupplierFormDialog
        businessId={businessId}
        open={formOpen}
        onOpenChange={setFormOpen}
        editingSupplier={editingSupplier}
      />
      <DeleteSupplierDialog
        businessId={businessId}
        open={!!deletingSupplier}
        onOpenChange={(open) => !open && setDeletingSupplier(null)}
        supplier={deletingSupplier}
      />
      <SupplierViewDialog
        open={!!viewingSupplier}
        onOpenChange={(open) => !open && setViewingSupplier(null)}
        supplier={viewingSupplier}
      />
    </div>
  )
}