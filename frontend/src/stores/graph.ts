import { create } from 'zustand'
import type { GraphNode, GraphLink, GraphData } from '@/lib/api'

interface GraphState {
  nodes: GraphNode[]
  links: GraphLink[]
  selectedNode: GraphNode | null
  setGraph: (data: GraphData) => void
  mergeGraph: (data: GraphData) => void
  reset: () => void
  setSelectedNode: (node: GraphNode | null) => void
}

export const useGraph = create<GraphState>((set) => ({
  nodes: [],
  links: [],
  selectedNode: null,

  setGraph: (data: GraphData) =>
    set({ nodes: data.nodes, links: data.links, selectedNode: null }),

  mergeGraph: (data: GraphData) =>
    set((state) => {
      const nodeMap = new Map(state.nodes.map((n) => [n.id, n]))
      for (const node of data.nodes) {
        nodeMap.set(node.id, node)
      }

      const linkSet = new Set(
        state.links.map((l) => {
          const src = typeof l.source === 'object' ? (l.source as any).id : l.source
          const tgt = typeof l.target === 'object' ? (l.target as any).id : l.target
          return `${src}-${tgt}-${l.relation_type}`
        })
      )
      const newLinks = [...state.links]
      for (const link of data.links) {
        const key = `${link.source}-${link.target}-${link.relation_type}`
        if (!linkSet.has(key)) {
          linkSet.add(key)
          newLinks.push(link)
        }
      }

      return { nodes: Array.from(nodeMap.values()), links: newLinks }
    }),

  reset: () => set({ nodes: [], links: [], selectedNode: null }),

  setSelectedNode: (node) => set({ selectedNode: node }),
}))
