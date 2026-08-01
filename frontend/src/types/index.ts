// 大类现在因人而异（由后端按画像生成），所以是动态字符串
export type Anchor = string

type AnchorColor = { bg: string; text: string; dot: string }

// 大类配色调色板，按出现顺序循环分配（苔绿/赭石/靛蓝/陶土/紫灰/橄榄）
const ANCHOR_PALETTE: AnchorColor[] = [
  { bg: 'rgba(92,139,110,0.12)', text: '#4A7A5E', dot: '#5C8B6E' },
  { bg: 'rgba(139,110,60,0.12)', text: '#7A5E30', dot: '#8B6E3C' },
  { bg: 'rgba(60,90,139,0.12)',  text: '#3A5880', dot: '#3C5A8B' },
  { bg: 'rgba(139,70,44,0.12)',  text: '#7A3C24', dot: '#8B4A2C' },
  { bg: 'rgba(110,80,130,0.12)', text: '#5E4080', dot: '#6E4C8B' },
  { bg: 'rgba(100,120,60,0.12)', text: '#566A2E', dot: '#6E823C' },
]

/** 按大类名哈希取配色（同名永远同色，Shelf 与详情页一致） */
export function anchorColor(name: string): AnchorColor {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return ANCHOR_PALETTE[h % ANCHOR_PALETTE.length]
}

export interface Insight {
  headline: string
  body: string
  pm_relevance: string
  category?: string       // backward compat
  anchor?: Anchor
  subtopic?: string
}

export interface Episode {
  id: string
  url: string
  created_at: string
  podcast_name: string
  title: string
  duration?: string
  summary: string
  key_insights: Insight[]
  reflection_questions: string[]
  framework_updates: Record<string, string[]>
  status?: 'transcribing' | 'analyzing' | 'done' | 'error'
  task_id?: string
  audio_url?: string
  description?: string
  error?: string
}

export interface TopicCard {
  name: string
  anchor: Anchor
  insight_count: number
  episode_count: number
  last_date: string
  days_since_active: number
  is_sleeping: boolean
  preview: string
}

export interface TopicInsight {
  episode_id: string
  episode_title: string
  podcast_name: string
  date: string
  headline: string
  body: string
  pm_relevance: string
}

export interface TopicDetail {
  name: string
  anchor: Anchor
  insights: TopicInsight[]
}

export type TopicsResponse = Record<Anchor, TopicCard[]>

export interface Profile {
  identity: string
  role: string
  focus: string[]
  anchors: Record<string, string[]>
  exists?: boolean
}

export interface Stats {
  episodes: number
  insights: number
  reflections: number
}

export interface Reflection {
  id: string
  episode_id: string
  episode_title: string
  question: string
  raw_text: string
  conclusion: string
  points: string[]
  open_questions: string[]
  created_at: string
}
