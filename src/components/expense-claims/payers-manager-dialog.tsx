import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  useExpenseClaimPayers,
  useCreateExpenseClaimPayer,
  useUpdateExpenseClaimPayer,
  useSetExpenseClaimPayerActive,
  useDeleteExpenseClaimPayer,
} from '@/hooks/use-expense-claim-payers'
import { getApiErrorMessage } from '@/lib/errors'

export function PayersManagerDialog({
  businessId,
  open,
  onOpenChange,
  canWrite,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  canWrite: boolean
}) {
  const { data: payers, isLoading } = useExpenseClaimPayers(businessId)
  const createPayer = useCreateExpenseClaimPayer(businessId)
  const updatePayer = useUpdateExpenseClaimPayer(businessId)
  const setActive = useSetExpenseClaimPayerActive(businessId)
  const deletePayer = useDeleteExpenseClaimPayer(businessId)

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<unknown>, onDone?: () => void) {
    setError(null)
    action()
      .then(() => onDone?.())
      .catch((err) => setError(getApiErrorMessage(err, 'Aksi gagal dijalankan')))
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setNewName('')
      setEditingId(null)
      setError(null)
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kelola Payers</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Payer adalah orang yang menalangi pengeluaran dan akan diganti (reimburse) oleh bisnis.
        </p>

        {canWrite && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const name = newName.trim()
              if (!name) return
              run(() => createPayer.mutateAsync({ name }), () => setNewName(''))
            }}
          >
            <Input
              placeholder="Nama Payer baru"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={225}
            />
            <Button type="submit" size="sm" disabled={!newName.trim() || createPayer.isPending}>
              <Plus className="mr-1 h-4 w-4" />
              Tambah
            </Button>
          </form>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}

        {!isLoading && (payers ?? []).length === 0 && (
          <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">Belum ada Payer.</p>
        )}

        {(payers ?? []).length > 0 && (
          <div className="rounded-md border">
            {(payers ?? []).map((payer) => {
              const editing = editingId === payer.id
              return (
                <div key={payer.id} className="flex items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0">
                  {editing ? (
                    <form
                      className="flex min-w-0 flex-1 items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        const name = editName.trim()
                        if (!name) return
                        run(
                          () => updatePayer.mutateAsync({ payerId: payer.id, name }),
                          () => setEditingId(null),
                        )
                      }}
                    >
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={225} autoFocus />
                      <Button type="submit" variant="ghost" size="icon" className="h-8 w-8" title="Simpan">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Batal"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </form>
                  ) : (
                    <>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm">{payer.name}</span>
                        {!payer.isActive && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      {canWrite && (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Ganti nama"
                            onClick={() => {
                              setEditingId(payer.id)
                              setEditName(payer.name)
                              setError(null)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() =>
                              run(() => setActive.mutateAsync({ payerId: payer.id, isActive: !payer.isActive }))
                            }
                          >
                            {payer.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Hapus"
                            onClick={() => run(() => deletePayer.mutateAsync(payer.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}