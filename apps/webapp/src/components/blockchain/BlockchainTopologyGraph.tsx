import { useEffect, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import type { NetworkNode, Organization } from '../../services/blockchain.service'

interface BlockchainTopologyGraphProps {
  nodes: NetworkNode[]
  organizations: Organization[]
}

const nodeStyles = {
  orderer: {
    background: '#fef3c7',
    border: '#f59e0b',
    color: '#92400e',
  },
  org: {
    background: '#e0f2fe',
    border: '#0284c7',
    color: '#075985',
  },
  peer: {
    background: '#dcfce7',
    border: '#16a34a',
    color: '#166534',
  },
}

const defaultNodeStyle = {
  border: '2px solid',
  borderRadius: '9999px',
  padding: '10px',
  fontSize: '12px',
  minWidth: '80px',
  textAlign: 'center' as const,
}

function GraphContent({ nodes, organizations }: { nodes: NetworkNode[]; organizations: Organization[] }) {
  const { setViewport } = useReactFlow()

  useEffect(() => {
    setViewport({ x: 0, y: 0, zoom: 0.8 }, { duration: 800 })
  }, [setViewport])

  const ordererNode = useMemo(
    () => ({
      id: 'orderer',
      type: 'default',
      position: { x: 300, y: 0 },
      data: { label: 'Orderer\n(Raft)' },
      style: {
        ...defaultNodeStyle,
        background: nodeStyles.orderer.background,
        borderColor: nodeStyles.orderer.border,
        color: nodeStyles.orderer.color,
      },
    }),
    [],
  )

  const orgNodes = useMemo(() => {
    if (organizations.length === 0) {
      return [
        {
          id: 'org-1',
          type: 'default',
          position: { x: 300, y: 100 },
          data: { label: 'Organization' },
          style: {
            ...defaultNodeStyle,
            background: nodeStyles.org.background,
            borderColor: nodeStyles.org.border,
            color: nodeStyles.org.color,
          },
        },
      ]
    }

    const startX = Math.max(50, 400 - organizations.length * 100)
    return organizations.map((org, index) => ({
      id: `org-${index}`,
      type: 'default',
      position: { x: startX + index * 200, y: 100 },
      data: { label: org.name },
      style: {
        ...defaultNodeStyle,
        background: nodeStyles.org.background,
        borderColor: nodeStyles.org.border,
        color: nodeStyles.org.color,
      },
    }))
  }, [organizations])

  const peerNodes = useMemo(() => {
    if (nodes.length === 0) {
      return []
    }
    const startX = Math.max(50, 400 - nodes.length * 80)
    return nodes.map((node, index) => ({
      id: `peer-${index}`,
      type: 'default',
      position: { x: startX + index * 160, y: 250 },
      data: { label: node.name },
      style: {
        ...defaultNodeStyle,
        background: nodeStyles.peer.background,
        borderColor: nodeStyles.peer.border,
        color: nodeStyles.peer.color,
      },
    }))
  }, [nodes])

  const initialNodes = useMemo(
    () => [ordererNode, ...orgNodes, ...peerNodes],
    [ordererNode, orgNodes, peerNodes],
  )

  const edges = useMemo(() => {
    const edgeList: {
      id: string
      source: string
      target: string
      animated?: boolean
      style?: React.CSSProperties
      markerEnd?: { type: MarkerType }
    }[] = []

    organizations.forEach((_, index) => {
      edgeList.push({
        id: `edge-orderer-org-${index}`,
        source: 'orderer',
        target: `org-${index}`,
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed },
      })
    })

    nodes.forEach((_, index) => {
      const orgIndex = index % Math.max(organizations.length, 1)
      edgeList.push({
        id: `edge-org-peer-${index}`,
        source: `org-${orgIndex}`,
        target: `peer-${index}`,
        style: { stroke: '#94a3b8', strokeWidth: 1 },
        markerEnd: { type: MarkerType.ArrowClosed },
      })
    })

    return edgeList
  }, [organizations, nodes])

  const [reactflowNodes, , onNodesChange] = useNodesState(initialNodes)
  const [reactflowEdges, , onEdgesChange] = useEdgesState(edges)

  return (
    <ReactFlow
      nodes={reactflowNodes}
      edges={reactflowEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      attributionPosition="bottom-left"
    >
      <Background color="#f1f5f9" gap={16} />
      <Controls />
      <MiniMap
        nodeColor={(n) => (n.style?.background as string) || '#fff'}
        maskColor="rgba(248, 250, 252, 0.8)"
      />
    </ReactFlow>
  )
}

export default function BlockchainTopologyGraph({
  nodes,
  organizations,
}: BlockchainTopologyGraphProps) {
  const hasData = nodes.length > 0 || organizations.length > 0

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto size-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H5a2 2 0 00-2 2v0a2 2 0 002 2h2m8 0a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2v-6a2 2 0 012-2m-8 0h2" />
          </svg>
          <p className="mt-2 text-sm text-slate-500">No hay nodos disponibles</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-96 rounded-xl border border-slate-200">
      <ReactFlowProvider>
        <GraphContent nodes={nodes} organizations={organizations} />
      </ReactFlowProvider>
    </div>
  )
}