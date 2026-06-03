import axios from 'axios'
import type { Episode, TopicsResponse, TopicDetail } from '../types'

// In dev, empty base → Vite proxy handles "/api".
// In production (PWA / APK), set VITE_API_BASE to the deployed backend URL.
export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') || ''

/** Build an absolute API path that works in dev, PWA, and native shells. */
export const apiUrl = (path: string) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`

const http = axios.create({ baseURL: `${API_BASE}/api` })

export async function processEpisode(url: string): Promise<Episode> {
  const { data } = await http.post<{ ok: boolean; episode: Episode }>('/process', { url })
  return data.episode
}

export async function fetchEpisodes(): Promise<Episode[]> {
  const { data } = await http.get<Episode[]>('/episodes')
  return data
}

export async function fetchEpisode(id: string): Promise<Episode> {
  const { data } = await http.get<Episode>(`/episodes/${id}`)
  return data
}

export async function fetchTopics(): Promise<TopicsResponse> {
  const { data } = await http.get<TopicsResponse>('/topics')
  return data
}

export async function fetchTopicDetail(anchor: string, subtopic: string): Promise<TopicDetail> {
  const { data } = await http.get<TopicDetail>('/topics/detail', { params: { anchor, subtopic } })
  return data
}

export async function reassignInsight(episode_id: string, headline: string, anchor: string, subtopic: string): Promise<void> {
  await http.post('/insights/reassign', { episode_id, headline, anchor, subtopic })
}

export async function deleteEpisode(id: string): Promise<void> {
  await http.delete(`/episodes/${id}`)
}
