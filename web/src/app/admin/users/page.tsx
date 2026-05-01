'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function AdminUsersPage() {
  const qc = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => { const { data } = await api.get('/admin/users'); return data },
    retry: 1,
  })

  const toggleBan = useMutation({
    mutationFn: ({ id, ban }: { id: string; ban: boolean }) =>
      api.patch(`/admin/users/${id}/${ban ? 'ban' : 'unban'}`),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['admin-users'] }) },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : isError ? (
        <div className="text-center py-16 border rounded-xl text-muted-foreground">
          <p className="font-medium text-destructive">Failed to load users</p>
          <p className="text-sm mt-1">Make sure you are logged in as admin@shoptaj.com</p>
        </div>
      ) : !data?.data?.length ? (
        <div className="text-center py-16 border rounded-xl text-muted-foreground">No users found</div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Joined</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.data.map((user: any) => (
                <tr key={user.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-muted-foreground text-xs">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isBanned ? 'destructive' : 'outline'}>{user.isBanned ? 'Banned' : 'Active'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant={user.isBanned ? 'outline' : 'destructive'}
                      onClick={() => toggleBan.mutate({ id: user.id, ban: !user.isBanned })}
                      disabled={user.role === 'ADMIN'}
                    >
                      {user.isBanned ? 'Unban' : 'Ban'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
