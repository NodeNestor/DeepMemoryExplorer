import { useState, useEffect } from 'react'
import { X, Expand, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Card, CardContent } from '@/components/ui/Card'
import { useGraph } from '@/stores/graph'
import { api, type SearchHit } from '@/lib/api'

export function GraphSidebar() {
  const { selectedNode, setSelectedNode, mergeGraph } = useGraph()
  const [relationships, setRelationships] = useState<any[]>([])
  const [relatedMemories, setRelatedMemories] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedNode) return
    let mounted = true
    setLoading(true)

    Promise.all([
      api.getEntityRelationships(selectedNode.id).catch(() => []),
      api.searchMemories(selectedNode.name, { limit: 5 }).catch(() => []),
    ]).then(([rels, mems]) => {
      if (mounted) {
        setRelationships(rels)
        setRelatedMemories(mems)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [selectedNode?.id])

  if (!selectedNode) return null

  const handleExpand = async () => {
    try {
      const data = await api.traverseGraph({ entity_id: selectedNode.id, depth: 1 })
      mergeGraph(data)
    } catch {
      // ignore
    }
  }

  return (
    <div className="w-72 border-l bg-card flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm truncate">{selectedNode.name}</h3>
        <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)} className="h-7 w-7">
          <X className="h-3 w-3" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <span className="text-xs text-muted-foreground">Type</span>
              <div className="mt-1">
                <Badge variant="secondary">{selectedNode.entity_type}</Badge>
              </div>
            </div>

            {selectedNode.description && (
              <div>
                <span className="text-xs text-muted-foreground">Description</span>
                <p className="text-sm mt-1">{selectedNode.description}</p>
              </div>
            )}

            <div>
              <span className="text-xs text-muted-foreground">
                Relationships ({relationships.length})
              </span>
              <div className="mt-1 space-y-1">
                {relationships.slice(0, 20).map((rel, i) => (
                  <div
                    key={i}
                    className="text-xs bg-muted rounded px-2 py-1 flex items-center gap-1"
                  >
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {rel.relation_type}
                    </Badge>
                    <span className="truncate">
                      {rel.source_entity?.name ?? rel.source_id} - {rel.target_entity?.name ?? rel.target_id}
                    </span>
                  </div>
                ))}
                {relationships.length === 0 && (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground">
                Related Memories ({relatedMemories.length})
              </span>
              <div className="mt-1 space-y-1">
                {relatedMemories.map((hit) => (
                  <Card key={hit.memory.id} className="bg-muted">
                    <CardContent className="p-2">
                      <p className="text-xs line-clamp-3">{hit.memory.content}</p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        #{hit.memory.id} - score: {hit.score.toFixed(3)}
                      </span>
                    </CardContent>
                  </Card>
                ))}
                {relatedMemories.length === 0 && (
                  <span className="text-xs text-muted-foreground">None found</span>
                )}
              </div>
            </div>
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t">
        <Button variant="outline" size="sm" onClick={handleExpand} className="w-full text-xs">
          <Expand className="h-3 w-3 mr-1" />
          Expand from this entity
        </Button>
      </div>
    </div>
  )
}
