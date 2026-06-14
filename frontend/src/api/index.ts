import axios from 'axios'
import type { Episode, TopicsResponse, TopicDetail, Reflection } from '../types'

// 部署好的后端地址（APK 离线包默认指向它；可被 VITE_API_BASE 覆盖）
const DEPLOYED_BACKEND = 'https://nico9800000-oxygen-squeeze.hf.space'
// 是否运行在 Capacitor 原生壳里（安卓 APK / iOS 原生）
const IS_NATIVE = typeof window !== 'undefined' && !!(window as any).Capacitor

// 优先用环境变量；原生壳里用内置后端地址；PWA/网页用同源（空）。
export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ||
  (IS_NATIVE ? DEPLOYED_BACKEND : '')

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

// ── Reflections（我的思考） ──
export async function createReflection(params: {
  audio: Blob; filename: string; episode_id: string; episode_title: string; podcast_name: string; question: string
}): Promise<Reflection> {
  const fd = new FormData()
  fd.append('audio', params.audio, params.filename)
  fd.append('episode_id', params.episode_id)
  fd.append('episode_title', params.episode_title)
  fd.append('podcast_name', params.podcast_name)
  fd.append('question', params.question)
  const { data } = await http.post<{ ok: boolean; reflection: Reflection }>('/reflections', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000,
  })
  return data.reflection
}

export async function fetchReflections(episodeId?: string): Promise<Reflection[]> {
  const { data } = await http.get<Reflection[]>('/reflections', { params: episodeId ? { episode_id: episodeId } : {} })
  return data
}

export async function deleteReflection(id: string): Promise<void> {
  await http.delete(`/reflections/${id}`)
}
