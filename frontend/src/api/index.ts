import axios from 'axios'
import type { Episode, Framework, FrameworkStats } from '../types'

const http = axios.create({ baseURL: '/api' })

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

export async function fetchFramework(): Promise<Framework> {
  const { data } = await http.get<Framework>('/framework')
  return data
}

export async function fetchFrameworkStats(): Promise<FrameworkStats> {
  const { data } = await http.get<FrameworkStats>('/framework/stats')
  return data
}
