import { useState, useRef, useEffect, useCallback } from 'react'
import { GraphCanvas } from '@/components/graph/GraphCanvas'
import { GraphControls } from '@/components/graph/GraphControls'
import { GraphSidebar } from '@/components/graph/GraphSidebar'
import { useGraph } from '@/stores/graph'
import { api } from '@/lib/api'
import { Loader2 } from 'lucide-react'

export function GraphPage() {
  const { selectedNode, mergeGraph, nodes } = useGraph()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [selectedNode])

  useEffect(() => {
    let mounted = true
    const loadFullGraph = async () => {
      try {
        const data = await api.getFullGraph({ depth: 2 })
        if (mounted) {
          useGraph.getState().setGraph(data)
        }
      } catch {
        // no initial data, user can search
      } finally {
        if (mounted) setInitialLoading(false)
      }
    }
    if (nodes.length === 0) {
      loadFullGraph()
    } else {
      setInitialLoading(false)
    }
    return () => {
      mounted = false
    }
  }, [])

  const handleFitView = useCallback(() => {
    // The graph canvas handles fit via its internal ref
  }, [])

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 relative" ref={containerRef}>
        {initialLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Search for an entity to start exploring the graph.</p>
          </div>
        ) : (
          <GraphCanvas width={dimensions.width} height={dimensions.height} />
        )}

        <div className="absolute top-4 left-4 z-10">
          <GraphControls onFitView={handleFitView} />
        </div>
      </div>

      {selectedNode && <GraphSidebar />}
    </div>
  )
}
