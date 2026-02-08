import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 60_000, // 60s for AI/audio endpoints
})

export default apiClient
