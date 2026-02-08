import apiClient from './client'

export const speakText = async (text) => {
  const formData = new FormData()
  formData.append('text', text)

  const response = await apiClient.post('/tts/', formData, {
    responseType: 'blob', // REQUIRED for audio
  })

  return response.data
}
