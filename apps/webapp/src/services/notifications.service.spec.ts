import * as notificationsService from './notifications.service'

const mockGet = jest.fn()
const mockPost = jest.fn()
const mockPatch = jest.fn()

jest.mock('../api/axios', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    patch: (...args: any[]) => mockPatch(...args),
  },
}))

describe('notifications.service', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getNotifications', () => {
    it('returns notifications on success', async () => {
      const data = [{ id: '1', title: 'Test' }]
      mockGet.mockResolvedValue({ data })
      const result = await notificationsService.getNotifications()
      expect(result).toEqual(data)
      expect(mockGet).toHaveBeenCalledWith('/notifications', { params: { includeRead: 'true' } })
    })

    it('passes includeRead=false', async () => {
      mockGet.mockResolvedValue({ data: [] })
      await notificationsService.getNotifications(false)
      expect(mockGet).toHaveBeenCalledWith('/notifications', { params: { includeRead: 'false' } })
    })

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await notificationsService.getNotifications()
      expect(result).toEqual([])
    })
  })

  describe('getPendingCount', () => {
    it('returns count from number response', async () => {
      mockGet.mockResolvedValue({ data: 5 })
      const result = await notificationsService.getPendingCount()
      expect(result).toBe(5)
    })

    it('returns count from object response', async () => {
      mockGet.mockResolvedValue({ data: { count: 3 } })
      const result = await notificationsService.getPendingCount()
      expect(result).toBe(3)
    })

    it('returns 0 on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await notificationsService.getPendingCount()
      expect(result).toBe(0)
    })
  })

  describe('markAsRead', () => {
    it('returns notification on success', async () => {
      const notification = { id: '1', status: 'READ' }
      mockPatch.mockResolvedValue({ data: notification })
      const result = await notificationsService.markAsRead('1')
      expect(result).toEqual(notification)
      expect(mockPatch).toHaveBeenCalledWith('/notifications/1/read')
    })

    it('returns null on error', async () => {
      mockPatch.mockRejectedValue(new Error('fail'))
      const result = await notificationsService.markAsRead('1')
      expect(result).toBeNull()
    })
  })

  describe('acceptNotification', () => {
    it('returns notification on success', async () => {
      const notification = { id: '1', status: 'ACCEPTED' }
      mockPatch.mockResolvedValue({ data: notification })
      const result = await notificationsService.acceptNotification('1')
      expect(result).toEqual(notification)
      expect(mockPatch).toHaveBeenCalledWith('/notifications/1/accept')
    })

    it('returns null on error', async () => {
      mockPatch.mockRejectedValue(new Error('fail'))
      const result = await notificationsService.acceptNotification('1')
      expect(result).toBeNull()
    })
  })

  describe('rejectNotification', () => {
    it('returns notification on success', async () => {
      const notification = { id: '1', status: 'REJECTED' }
      mockPatch.mockResolvedValue({ data: notification })
      const result = await notificationsService.rejectNotification('1')
      expect(result).toEqual(notification)
      expect(mockPatch).toHaveBeenCalledWith('/notifications/1/reject')
    })

    it('returns null on error', async () => {
      mockPatch.mockRejectedValue(new Error('fail'))
      const result = await notificationsService.rejectNotification('1')
      expect(result).toBeNull()
    })
  })

  describe('sendNotificationToUser', () => {
    it('returns response on success', async () => {
      const response = { id: 'new-notif' }
      mockPost.mockResolvedValue({ data: response })
      const result = await notificationsService.sendNotificationToUser({ userId: 'user-1', title: 'Test', message: 'Hello' })
      expect(result).toEqual(response)
      expect(mockPost).toHaveBeenCalledWith('/notifications/send-to-user', { userId: 'user-1', title: 'Test', message: 'Hello' })
    })
  })

  describe('sendNotificationToRoles', () => {
    it('returns response on success', async () => {
      const response = { count: 3 }
      mockPost.mockResolvedValue({ data: response })
      const result = await notificationsService.sendNotificationToRoles({ roles: ['ADMIN'], title: 'Test', message: 'Hello' })
      expect(result).toEqual(response)
      expect(mockPost).toHaveBeenCalledWith('/notifications/send-to-roles', { roles: ['ADMIN'], title: 'Test', message: 'Hello' })
    })
  })
})
