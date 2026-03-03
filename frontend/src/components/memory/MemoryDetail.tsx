import { useState, useEffect } from 'react'
import { X, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { api, type Memory, type MemoryHistory } from '@/lib/api'
import { timeAgo } from '@/lib/utils'

interface MemoryDetailProps {
  memoryId: number
  onClose: () => void
  onDeleted?: (id: number) => void
}

export function MemoryDetail({ memoryId, onClose, onDeleted }: MemoryDetailProps) {
  const [memory, setMemory] = useState<Memory | null>(null)
  const [history, setHistory] = useState<MemoryHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    Promise.all([api.getMemory(memoryId), api.getMemoryHistory(memoryId)])
      .then(([mem, hist]) => {
        if (mounted) {
          setMemory(mem)
          setHistory(hist)
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [memoryId])

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      await api.deleteMemory(memoryId, 'Deleted via Explorer UI')
      onDeleted?.(memoryId)
      onClose()
    } catch (err: any) {
      setError(err.message)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={onClose} className="mt-2">
          Close
        </Button>
      </div>
    )
  }

  if (!memory) return null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">Memory #{memory.id}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Content</h4>
            <p className="text-sm whitespace-pre-wrap">{memory.content}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Type</h4>
              <Badge variant="secondary">{memory.memory_type}</Badge>
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Confidence</h4>
              <span className="text-sm">{(memory.confidence * 100).toFixed(1)}%</span>
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Source</h4>
              <span className="text-sm">{memory.source || 'unknown'}</span>
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Created</h4>
              <span className="text-sm">{timeAgo(memory.created_at)}</span>
            </div>
          </div>

          {memory.agent_id && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Agent</h4>
              <span className="text-sm">{memory.agent_id}</span>
            </div>
          )}

          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Tags</h4>
            <div className="flex flex-wrap gap-1">
              {memory.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {memory.tags.length === 0 && (
                <span className="text-xs text-muted-foreground">No tags</span>
              )}
            </div>
          </div>

          {Object.keys(memory.metadata).length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Metadata</h4>
              <pre className="text-xs bg-muted rounded p-2 overflow-auto">
                {JSON.stringify(memory.metadata, null, 2)}
              </pre>
            </div>
          )}

          {history.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">History</h4>
              <div className="space-y-2">
                {history.map((entry) => (
                  <div key={entry.id} className="border rounded p-2 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        {entry.operation}
                      </Badge>
                      <span className="text-muted-foreground">
                        {timeAgo(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{entry.reason}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      by {entry.changed_by}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="w-full"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          {confirmDelete ? 'Confirm Delete' : 'Delete Memory'}
        </Button>
      </div>
    </div>
  )
}
