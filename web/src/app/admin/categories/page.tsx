'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function AdminCategoriesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const { register, handleSubmit, reset, setValue } = useForm()

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { const { data } = await api.get('/categories'); return data },
  })

  const create = useMutation({
    mutationFn: (body: any) => api.post('/admin/categories', body),
    onSuccess: () => { toast.success('Category created'); qc.invalidateQueries({ queryKey: ['categories'] }); setShowForm(false); reset() },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create category')
    },
  })

  const update = useMutation({
    mutationFn: ({ id, ...body }: any) => api.patch(`/admin/categories/${id}`, body),
    onSuccess: () => { toast.success('Category updated'); qc.invalidateQueries({ queryKey: ['categories'] }); setEditId(null); reset() },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => { toast.success('Category deleted'); qc.invalidateQueries({ queryKey: ['categories'] }) },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Cannot delete — category may have products'),
  })

  const onSubmit = (data: any) => {
    const payload = { name: data.name, parentId: data.parentId || undefined, imageUrl: data.imageUrl || undefined }
    if (editId) update.mutate({ id: editId, ...payload })
    else create.mutate(payload)
  }

  const startEdit = (cat: any) => {
    setEditId(cat.id)
    setShowForm(false)
    setValue('name', cat.name)
    setValue('parentId', cat.parentId || '')
  }

  const cancel = () => { setShowForm(false); setEditId(null); reset() }

  // Flatten categories for parent selector
  const allFlat = categories?.flatMap((c: any) => [c, ...(c.children || [])]) || []

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button onClick={() => { cancel(); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-2" />Add Category
        </Button>
      </div>

      {(showForm || editId) && (
        <Card className="mb-6 border-primary/30">
          <CardHeader><CardTitle>{editId ? 'Edit Category' : 'New Category'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium">Name *</label>
                <Input {...register('name', { required: true })} placeholder="Electronics" />
              </div>
              <div>
                <label className="text-xs font-medium">Parent Category <span className="text-muted-foreground">(for sub-categories)</span></label>
                <select className="w-full h-10 border rounded-md px-3 text-sm bg-background" {...register('parentId')}>
                  <option value="">None (top-level)</option>
                  {categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Image URL <span className="text-muted-foreground">(optional)</span></label>
                <Input {...register('imageUrl')} placeholder="https://..." />
              </div>
              <div className="sm:col-span-3 flex gap-3">
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {create.isPending || update.isPending ? 'Saving…' : editId ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={cancel}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !categories?.length ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl">
          <p className="text-lg mb-2">No categories yet</p>
          <p className="text-sm">Click "Add Category" to create your first one.</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          {categories.map((cat: any) => (
            <div key={cat.id}>
              {/* Parent category row */}
              <div className="flex items-center justify-between px-4 py-3 border-b hover:bg-muted/20 bg-muted/5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{cat.name}</span>
                  {cat.children?.length > 0 && (
                    <Badge variant="secondary">{cat.children.length} sub</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(cat)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => { if (confirm(`Delete "${cat.name}"?`)) remove.mutate(cat.id) }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Sub-categories */}
              {cat.children?.map((child: any) => (
                <div key={child.id} className="flex items-center justify-between px-4 py-2.5 border-b hover:bg-muted/20 pl-10">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ChevronRight className="h-3 w-3" />
                    {child.name}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(child)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => { if (confirm(`Delete "${child.name}"?`)) remove.mutate(child.id) }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
