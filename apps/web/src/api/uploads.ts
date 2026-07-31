import { http } from './client'

export async function uploadMarkdownImages(files: File[]): Promise<string[]> {
  const payload = new FormData()
  for (const file of files)
    payload.append('images', file)

  const result = await http.post<{ urls: string[] }, FormData>(
    '/uploads/markdown-images',
    payload,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return result.urls
}
