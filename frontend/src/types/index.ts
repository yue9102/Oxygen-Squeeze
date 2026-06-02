export interface Insight {
  headline: string
  body: string
  pm_relevance: string
  category: '技术趋势' | '产品设计' | '行业动态' | '具身智能' | '商业模式'
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
}

export interface FrameworkEntry {
  text: string
  date: string
  source: string
  episode_id: string
  episode_title: string
}

export type Framework = Record<string, FrameworkEntry[]>

export type FrameworkStats = Record<string, number>

export const CATEGORIES = ['技术趋势', '产品设计', '行业动态', '具身智能', '商业模式'] as const
export type Category = typeof CATEGORIES[number]
