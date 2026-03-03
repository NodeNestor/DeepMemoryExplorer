import { useCallback, useRef, useEffect } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { useGraph } from '@/stores/graph'
import { api } from '@/lib/api'

const TYPE_COLORS: Record<string, string> = {
  person: '#ef4444',
  organization: '#f97316',
  location: '#eab308',
  concept: '#22c55e',
  technology: '#06b6d4',
  event: '#8b5cf6',
  product: '#ec4899',
  paper: '#14b8a6',
  dataset: '#f59e0b',
  default: '#6b7280',
}

function getNodeColor(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] ?? TYPE_COLORS.default
}

interface GraphCanvasProps {
  width: number
  height: number
}

export function GraphCanvas({ width, height }: GraphCanvasProps) {
  const { nodes, links, setSelectedNode, mergeGraph } = useGraph()
  const fgRef = useRef<any>(null)

  const graphData = { nodes: [...nodes], links: [...links] }

  const handleNodeClick = useCallback(
    (node: any) => {
      setSelectedNode(node)
    },
    [setSelectedNode]
  )

  const handleNodeDoubleClick = useCallback(
    async (node: any) => {
      try {
        const data = await api.traverseGraph({ entity_id: node.id, depth: 1 })
        mergeGraph(data)
      } catch {
        // silently fail
      }
    },
    [mergeGraph]
  )

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.name
      const fontSize = Math.max(10 / globalScale, 2)
      const size = Math.sqrt(node.val || 1) * 3 + 2
      const color = getNodeColor(node.entity_type)

      // Node circle
      ctx.beginPath()
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Label
      if (globalScale > 0.5) {
        ctx.font = `${fontSize}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.fillText(label, node.x, node.y + size + 2)
      }
    },
    []
  )

  const linkLabel = useCallback((link: any) => link.relation_type || '', [])

  // Tune d3-force: weaker charge so nodes don't explode apart on drag
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    fg.d3Force('charge')?.strength(-30).distanceMax(200)
    fg.d3Force('link')?.distance(40)
    fg.d3Force('center')?.strength(0.05)
  }, [])

  useEffect(() => {
    if (fgRef.current && nodes.length > 0) {
      setTimeout(() => fgRef.current?.zoomToFit?.(400, 50), 300)
    }
  }, [nodes.length])

  // Pin node position on drag so the rest of the graph stays calm
  const handleNodeDrag = useCallback((node: any) => {
    node.fx = node.x
    node.fy = node.y
  }, [])

  const handleNodeDragEnd = useCallback((node: any) => {
    // Keep it pinned where the user dropped it
    node.fx = node.x
    node.fy = node.y
  }, [])

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={graphData}
      width={width}
      height={height}
      nodeCanvasObject={nodeCanvasObject}
      nodePointerAreaPaint={(node: any, color, ctx) => {
        const size = Math.sqrt(node.val || 1) * 3 + 2
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI)
        ctx.fill()
      }}
      onNodeClick={handleNodeClick}
      onNodeDblClick={handleNodeDoubleClick}
      onNodeDrag={handleNodeDrag}
      onNodeDragEnd={handleNodeDragEnd}
      linkLabel={linkLabel}
      linkColor={() => 'rgba(255,255,255,0.15)'}
      linkWidth={(link: any) => Math.max((link.weight || 1) * 0.5, 0.5)}
      linkDirectionalArrowLength={4}
      linkDirectionalArrowRelPos={1}
      backgroundColor="transparent"
      nodeId="id"
      linkSource="source"
      linkTarget="target"
      cooldownTicks={100}
      d3AlphaDecay={0.05}
      d3VelocityDecay={0.3}
    />
  )
}
