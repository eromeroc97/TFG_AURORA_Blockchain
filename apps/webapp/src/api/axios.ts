import axios, { AxiosError } from 'axios'

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

let unauthorizedHandler: ((error: AxiosError) => void) | null = null

export function setUnauthorizedHandler(handler: ((error: AxiosError) => void) | null) {
  unauthorizedHandler = handler
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      unauthorizedHandler?.(error)
    }

    return Promise.reject(error)
  },
)