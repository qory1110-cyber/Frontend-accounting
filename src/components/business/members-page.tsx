import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2, Users } from 'lucide-react'
import {
  useBusinessMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
} from '@/hooks/use-members'
import { useBusiness } from '@/hooks/use-businesses'
import { getApiErrorMessage } from '@/lib/errors'

type Role = 'admin' | 'accountant' | 'viewer'

export function MembersPage({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)
  const { data: members, isLoading } = useBusinessMembers(businessId)
  const [inviteOpen, setInviteOpen] = useState(false)

  const isAdmin = business?.role === 'admin'

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Members</h1>
        {isAdmin && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-background">
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Memuat...</p>}

        {!isLoading && (members ?? []).length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Belum ada anggota lain.</p>
          </div>
        )}

        {(members ?? []).map((m) => (
          <MemberRow key={m.userId} businessId={businessId} member={m} isAdmin={isAdmin} />
        ))}
      </div>

      <InviteMemberDialog businessId={businessId} open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  )
}

interface Member {
  userId: string
  name: string
  email: string
  role: Role
  status: string
}

function MemberRow({
  businessId,
  member,
  isAdmin,
}: {
  businessId: string
  member: Member
  isAdmin: boolean
}) {
  const updateRole = useUpdateMemberRole(businessId)
  const removeMember = useRemoveMember(businessId)

  return (
    <div className="flex items-center justify-between border-b px-4 py-3 last:border-b-0">
      <div>
        <p className="text-sm font-medium">{member.name}</p>
        <p className="text-xs text-muted-foreground">{member.email}</p>
      </div>

      <div className="flex items-center gap-2">
        {member.status === 'invited' && (
          <Badge variant="outline" className="font-normal">
            invited
          </Badge>
        )}

        {isAdmin ? (
          <Select
            value={member.role}
            onValueChange={(v) =>
              v && updateRole.mutate({ userId: member.userId, role: v as Role })
            }
          >
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="accountant">Accountant</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className="font-normal">
            {member.role}
          </Badge>
        )}

        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => removeMember.mutate(member.userId)}
            aria-label="Hapus anggota"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

const inviteSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  role: z.enum(['admin', 'accountant', 'viewer']),
})

function InviteMemberDialog({
  businessId,
  open,
  onOpenChange,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const inviteMember = useInviteMember(businessId)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: '', role: 'viewer' as Role },
    validators: { onSubmit: inviteSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await inviteMember.mutateAsync(value)
        form.reset()
        onOpenChange(false)
      } catch (err) {
        setServerError(getApiErrorMessage(err, 'Gagal mengundang anggota'))
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col gap-4"
        >
          <form.Field name="email">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="role">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label>Role</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange((v ?? 'viewer') as Role)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
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
                  {isSubmitting ? 'Mengundang...' : 'Invite'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}