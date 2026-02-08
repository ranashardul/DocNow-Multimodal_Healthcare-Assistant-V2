import apiClient from "./client"

export const analyze = async ({ messages, image }) => {
  const formData = new FormData()

  formData.append("messages", JSON.stringify(messages))

  if (image) {
    formData.append("image", image)
  }

  const response = await apiClient.post("/analyze/", formData)
  return response.data
}
