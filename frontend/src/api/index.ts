import axios from 'axios'
import type { Episode, Profile, Reflection, Stats, TopicDetail, TopicsResponse } from '../types'
import {
  deleteEpisode as deleteLocalEpisode,
  deleteReflection as deleteLocalReflection,
  getEpisode,
  getEpisodes,
  getProfile as getLocalProfile,
  getReflections,
  getStats,
  getTopicDetail,
  getTopics,
  reassignInsight as reassignLocalInsight,
  saveEpisode,
  saveProfile as saveLocalProfile,
  saveReflection,
} from '../data/localStore'

// APK 默认指向已部署的计算服务；PWA/网页使用同源 API，可由 VITE_API_BASE 覆盖。
const DEPLOYED_BACKEND = 'https://nico9800000-oxygen-squeeze.hf.space'
type CapacitorWindow = Window & { Capacitor?: unknown }
const IS_NATIVE = typeof window !== 'undefined' && !!(window as CapacitorWindow).Capacitor

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ||
  (IS_NATIVE ? DEPLOYED_BACKEND : '')

export const apiUrl = (path: string) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`

const http = axios.create({ baseURL: `${API_BASE}/api` })

const EMPTY_PROFILE: Profile = { identity: '', role: '', focus: [], anchors: {}, exists: false }

/** 读取本机画像；它只存在当前浏览器配置/当前 App 的 IndexedDB 中。 */
export async function fetchProfile(): Promise<Profile> {
  return (await getLocalProfile()) ?? EMPTY_PROFILE
}

/** 后端仅生成框架，画像与框架随后立即保存到当前设备。 */
export async function saveProfile(input: { identity: string; role: string; focus: string[] }): Promise<Profile> {
  const { data } = await http.post<{ ok: boolean; anchors: Profile['anchors'] }>('/framework', input, { timeout: 60000 })
  const profile: Profile = { ...input, anchors: data.anchors, exists: true }
  await saveLocalProfile(profile)
  return profile
}

/** 提交播客后立即将处理状态写入本机，关闭 App 后仍可继续查看/轮询。 */
export async function processEpisode(url: string): Promise<Episode> {
  const profile = await getLocalProfile()
  const { data } = await http.post<{ ok: boolean; episode: Episode }>('/process', {
    url,
    context: profile ?? undefined,
  })
  await saveEpisode(data.episode)
  return data.episode
}

/** 推进一次本机待转录任务。任务 ID 只保存在用户自己的设备内。 */
export async function advanceEpisode(episode: Episode): Promise<Episode> {
  if (!episode.task_id) return episode
  const profile = await getLocalProfile()
  const { data } = await http.post<{
    status: 'running' | 'done' | 'error'
    analysis?: Pick<Episode, 'summary' | 'key_insights' | 'reflection_questions' | 'framework_updates'>
    error?: string
  }>('/process/advance', {
    task_id: episode.task_id,
    episode: {
      url: episode.url,
      podcast_name: episode.podcast_name,
      title: episode.title,
      description: episode.description ?? '',
      duration: episode.duration,
      audio_url: episode.audio_url,
    },
    context: profile ?? undefined,
  }, { timeout: 60000 })

  const next = data.status === 'done' && data.analysis
    ? { ...episode, ...data.analysis, status: 'done' as const, task_id: undefined, error: undefined }
    : data.status === 'error'
      ? { ...episode, status: 'error' as const, error: data.error || '转录失败' }
      : episode

  await saveEpisode(next)
  return next
}

export async function fetchEpisodes(): Promise<Episode[]> {
  return getEpisodes()
}

export async function fetchEpisode(id: string): Promise<Episode> {
  const episode = await getEpisode(id)
  if (!episode) throw new Error('找不到这条播客记录')
  return episode
}

export async function fetchTopics(): Promise<TopicsResponse> {
  return getTopics()
}

export async function fetchTopicDetail(anchor: string, subtopic: string): Promise<TopicDetail> {
  const detail = await getTopicDetail(anchor, subtopic)
  if (!detail) throw new Error('找不到这个话题')
  return detail
}

export async function reassignInsight(episodeId: string, headline: string, anchor: string, subtopic: string): Promise<void> {
  await reassignLocalInsight(episodeId, headline, anchor, subtopic)
}

export async function deleteEpisode(id: string): Promise<void> {
  await deleteLocalEpisode(id)
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
  await saveReflection(data.reflection)
  return data.reflection
}

export async function fetchReflections(episodeId?: string): Promise<Reflection[]> {
  return getReflections(episodeId)
}

export async function deleteReflection(id: string): Promise<void> {
  await deleteLocalReflection(id)
}

export async function fetchStats(): Promise<Stats> {
  return getStats()
}
