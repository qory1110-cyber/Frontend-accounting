import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDeleteJournalEntry } from '@/hooks/use-journal-entries'
import { getApiErrorMessage } from '@/lib/errors'

export function DeleteJournalEntryDialog({
  businessId,
  open,
  onOpenChange,
  entry,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: { id: string; reference: string } | null
}) {
  const deleteEntry = useDeleteJournalEntry(businessId)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (!next) setError(null)
    onOpenChange(next)
  }

  async function handleDelete() {
    if (!entry) return
    setError(null)
    try {
      await deleteEntry.mutateAsync(entry.id)
      handleOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal menghapus jurnal'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Jurnal?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Menghapus <span className="font-medium text-foreground">{entry?.reference}</span> akan memposting jurnal
          pembalik bertanggal hari ini, lalu jurnal ini disembunyikan dari daftar. Jurnal tidak bisa dihapus kalau
          menyentuh akun bank yang periodenya sudah dikunci. Tindakan ini tidak bisa dibatalkan.
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteEntry.isPending}>
            {deleteEntry.isPending ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}