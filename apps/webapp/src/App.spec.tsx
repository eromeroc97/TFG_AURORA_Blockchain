import { render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { apiClient } from './api/axios'

jest.mock('./api/axios', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('App routing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.history.pushState({}, '', '/')
  })

  it('redirects the root path to login', async () => {
    mockedApiClient.post.mockRejectedValueOnce(new Error('refresh unavailable'))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Accede al panel de AURORA/i })).toBeInTheDocument()
    })
  })
})