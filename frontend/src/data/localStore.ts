import type {
  Episode,
  Profile,
  Reflection,
  Stats,
  TopicCard,
  TopicDetail,
  TopicInsight,
  TopicsResponse,
} from '../types'

const DB_NAME = 'lili-device-data'
const DB_VERSION = 1
const PROFILE_STORE = 'profile'
const EPISODE_STORE = 'episodes'
const REFLECTION_STORE = 'reflections'
const PROFILE_KEY = 'current'

const DEFAULT_TAXONOMY: Record<string, string[]> = {
  'AI认知': ['大模型', 'Agent', '多模态', '训练与推理', '评测与对齐', '开源生态'],
  '行业知识': ['具身智能', '教育', '医疗健康', '金融', '消费应用', '内容创作'],
  '产品思维': ['产品设计', '交互体验', 'PM方法论', '用户增长', '组织与协作'],
  '趋势与商业': ['技术趋势', '商业模式', '市场格局', '投资融资', '政策监管'],
}

type ProfileRecord = { key: string; value: Profile }

let database: Promise<IDBDatabase> | undefined

function openDatabase(): Promise<IDBDatabase> {
  if (database) return database

  database = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('无法打开本机数据'))
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PROFILE_STORE)) db.createObjectStore(PROFILE_STORE, { keyPath: 'key' })
      if (!db.objectStoreNames.contains(EPISODE_STORE)) db.createObjectStore(EPISODE_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(REFLECTION_STORE)) db.createObjectStore(REFLECTION_STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
  })

  return database
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('本机数据操作失败'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('本机数据保存失败'))
    transaction.onabort = () => reject(transaction.error ?? new Error('本机数据保存失败'))
  })
}

async function readOne<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDatabase()
  const transaction = db.transaction(storeName, 'readonly')
  const result = await requestResult<T | undefined>(transaction.objectStore(storeName).get(key))
  await transactionDone(transaction)
  return result
}

async function readAll<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase()
  const transaction = db.transaction(storeName, 'readonly')
  const result = await requestResult<T[]>(transaction.objectStore(storeName).getAll())
  await transactionDone(transaction)
  return result
}

async function putOne(storeName: string, value: unknown): Promise<void> {
  const db = await openDatabase()
  const transaction = db.transaction(storeName, 'readwrite')
  transaction.objectStore(storeName).put(value)
  await transactionDone(transaction)
}

async function removeOne(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await openDatabase()
  const transaction = db.transaction(storeName, 'readwrite')
  transaction.objectStore(storeName).delete(key)
  await transactionDone(transaction)
}

function byNewest<T extends { created_at: string }>(items: T[]): T[] {
  return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

function datePart(value: string): string {
  return value.slice(0, 10)
}

function daysSince(value: string): number {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 999
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000))
}

export async function getProfile(): Promise<Profile | undefined> {
  const record = await readOne<ProfileRecord>(PROFILE_STORE, PROFILE_KEY)
  return record?.value
}

export async function saveProfile(profile: Profile): Promise<void> {
  await putOne(PROFILE_STORE, { key: PROFILE_KEY, value: profile } satisfies ProfileRecord)
}

export async function getEpisodes(): Promise<Episode[]> {
  return byNewest(await readAll<Episode>(EPISODE_STORE))
}

export async function getEpisode(id: string): Promise<Episode | undefined> {
  return readOne<Episode>(EPISODE_STORE, id)
}

export async function saveEpisode(episode: Episode): Promise<void> {
  await putOne(EPISODE_STORE, episode)
}

export async function deleteEpisode(id: string): Promise<void> {
  await removeOne(EPISODE_STORE, id)
}

export async function getReflections(episodeId?: string): Promise<Reflection[]> {
  const items = byNewest(await readAll<Reflection>(REFLECTION_STORE))
  return episodeId ? items.filter(item => item.episode_id === episodeId) : items
}

export async function saveReflection(reflection: Reflection): Promise<void> {
  await putOne(REFLECTION_STORE, reflection)
}

export async function deleteReflection(id: string): Promise<void> {
  await removeOne(REFLECTION_STORE, id)
}

export async function getStats(): Promise<Stats> {
  const [episodes, reflections] = await Promise.all([getEpisodes(), getReflections()])
  const completed = episodes.filter(episode => (episode.status ?? 'done') === 'done')
  return {
    episodes: completed.length,
    insights: completed.reduce((count, episode) => count + episode.key_insights.length, 0),
    reflections: reflections.length,
  }
}

export async function reassignInsight(episodeId: string, headline: string, anchor: string, subtopic: string): Promise<void> {
  const episode = await getEpisode(episodeId)
  if (!episode) throw new Error('找不到这条播客记录')

  const keyInsights = episode.key_insights.map(insight => (
    insight.headline === headline ? { ...insight, anchor, subtopic } : insight
  ))
  await saveEpisode({ ...episode, key_insights: keyInsights })
}

export async function getTopics(): Promise<TopicsResponse> {
  const [profile, episodes] = await Promise.all([getProfile(), getEpisodes()])
  const taxonomy = profile?.anchors && Object.keys(profile.anchors).length > 0 ? profile.anchors : DEFAULT_TAXONOMY
  const result: TopicsResponse = Object.fromEntries(Object.keys(taxonomy).map(anchor => [anchor, []]))
  const buckets = new Map<string, { anchor: string; name: string; insights: TopicInsight[]; lastDate: string }>()

  for (const episode of episodes) {
    if ((episode.status ?? 'done') !== 'done') continue
    const episodeDate = datePart(episode.created_at)
    for (const insight of episode.key_insights) {
      const anchor = insight.anchor || Object.keys(taxonomy)[0] || '其他'
      const name = insight.subtopic || '其他'
      const key = `${anchor}\u0000${name}`
      const bucket = buckets.get(key) ?? { anchor, name, insights: [], lastDate: episodeDate }
      bucket.insights.push({
        episode_id: episode.id,
        episode_title: episode.title,
        podcast_name: episode.podcast_name,
        date: episodeDate,
        headline: insight.headline,
        body: insight.body,
        pm_relevance: insight.pm_relevance,
      })
      if (episodeDate > bucket.lastDate) bucket.lastDate = episodeDate
      buckets.set(key, bucket)
    }
  }

  for (const bucket of buckets.values()) {
    const days = daysSince(bucket.lastDate)
    const card: TopicCard = {
      name: bucket.name,
      anchor: bucket.anchor,
      insight_count: bucket.insights.length,
      episode_count: new Set(bucket.insights.map(insight => insight.episode_id)).size,
      last_date: bucket.lastDate,
      days_since_active: days,
      is_sleeping: days > 30,
      preview: bucket.insights[0]?.headline ?? '',
    }
    ;(result[bucket.anchor] ??= []).push(card)
  }

  for (const anchor of Object.keys(result)) {
    result[anchor].sort((a, b) => b.last_date.localeCompare(a.last_date))
  }
  return result
}

export async function getTopicDetail(anchor: string, subtopic: string): Promise<TopicDetail | undefined> {
  const episodes = await getEpisodes()
  const insights: TopicInsight[] = []

  for (const episode of episodes) {
    if ((episode.status ?? 'done') !== 'done') continue
    for (const insight of episode.key_insights) {
      if (insight.anchor === anchor && insight.subtopic === subtopic) {
        insights.push({
          episode_id: episode.id,
          episode_title: episode.title,
          podcast_name: episode.podcast_name,
          date: datePart(episode.created_at),
          headline: insight.headline,
          body: insight.body,
          pm_relevance: insight.pm_relevance,
        })
      }
    }
  }

  if (insights.length === 0) return undefined
  insights.sort((a, b) => b.date.localeCompare(a.date))
  return { name: subtopic, anchor, insights }
}
