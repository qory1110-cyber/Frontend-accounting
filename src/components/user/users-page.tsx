import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, User as UserIcon } from 'lucide-react'
import { useUsersList } from '@/hooks/use-users'
import { AddUserDialog } from './add-user-dialog'

export function UsersPage() {
  const { data: users, isLoading } = useUsersList()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Users</h1>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New User
        </Button>
      </div>

      <div className="rounded-lg border bg-background">
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Memuat...</p>}

        {!isLoading && (users ?? []).length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <UserIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Belum ada user lain.</p>
          </div>
        )}

        {(users ?? []).map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between border-b px-4 py-3 last:border-b-0"
          >
            <div>
              <p className="text-sm font-medium">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>
          </div>
        ))}
      </div>

      <AddUserDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}