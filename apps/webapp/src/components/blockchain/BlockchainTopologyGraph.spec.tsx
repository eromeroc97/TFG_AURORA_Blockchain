import { render, screen } from '@testing-library/react'
import BlockchainTopologyGraph from './BlockchainTopologyGraph'

jest.mock('reactflow', () => {
  const MockRF = ({ children }: { children: React.ReactNode }) => <div data-testid="reactflow">{children}</div>
  return {
    __esModule: true,
    default: MockRF,
    ReactFlow: MockRF,
    Background: () => null,
    Controls: () => null,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useNodesState: (initial: unknown) => [initial, jest.fn(), jest.fn()],
    useEdgesState: (initial: unknown) => [initial, jest.fn(), jest.fn()],
    useReactFlow: () => ({ setViewport: jest.fn() }),
    MarkerType: { ArrowClosed: 'arrowclosed' as const },
  }
})

describe('BlockchainTopologyGraph', () => {
  it('renders empty state when no nodes or organizations', () => {
    render(<BlockchainTopologyGraph nodes={[]} organizations={[]} />)
    expect(screen.getByText('No hay nodos disponibles')).toBeInTheDocument()
  })

  it('renders ReactFlow when organizations provided', () => {
    const organizations = [{ id: 'org-1', name: 'Org1' }]
    render(<BlockchainTopologyGraph nodes={[]} organizations={organizations} />)
    expect(screen.getByTestId('reactflow')).toBeInTheDocument()
  })

  it('renders default org when no organizations', () => {
    const nodes = [{ id: 'peer-1', name: 'Peer 1', organization: 'Org1', status: 'active' }]
    render(<BlockchainTopologyGraph nodes={nodes} organizations={[]} />)
    expect(screen.getByTestId('reactflow')).toBeInTheDocument()
  })

  it('renders ReactFlow when nodes and organizations provided', () => {
    const nodes = [{ id: 'peer-1', name: 'Peer 1', organization: 'Org1', status: 'active' }]
    const organizations = [{ id: 'org-1', name: 'Org1' }]
    render(<BlockchainTopologyGraph nodes={nodes} organizations={organizations} />)
    const rfElements = screen.getAllByTestId('reactflow')
    expect(rfElements.length).toBeGreaterThan(0)
  })
})
