import axios, { AxiosError } from 'axios'

const authApiBasePath = import.meta.env.VITE_API_BASE_PATH

export const apiClient = axios.create({
  baseURL: authApiBasePath,
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