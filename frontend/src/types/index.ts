export type Anchor = 'AI认知' | '行业知识' | '产品思维' | '趋势与商业'

export const ANCHORS: Anchor[] = ['AI认知', '行业知识', '产品思维', '趋势与商业']

/** 大类下的固定子类（与后端 taxonomy.py 保持一致，前端用于「重新归类」选择器） */
export const TAXONOMY: Record<Anchor, string[]> = {
  'AI认知':    ['大模型', 'Agent', '多模态', '训练与推理', '评测与对齐', '开源生态'],
  '行业知识':  ['具身智能', '教育', '医疗健康', '金融', '消费应用', '内容创作'],
  '产品思维':  ['产品设计', '交互体验', 'PM方法论', '用户增长', '组织与协作'],
  '趋势与商业': ['技术趋势', '商业模式', '市场格局', '投资融资', '政策监管'],
}

export const ANCHOR_COLOR: Record<Anchor, { bg: string; text: string; dot: string }> = {
  'AI认知':   { bg: 'rgba(92,139,110,0.12)',  text: '#4A7A5E', dot: '#5C8B6E' },
  '行业知识':  { bg: 'rgba(139,110,60,0.12)',  text: '#7A5E30', dot: '#8B6E3C' },
  '产品思维':  { bg: 'rgba(60,90,139,0.12)',   text: '#3A5880', dot: '#3C5A8B' },
  '趋势与商业':{ bg: 'rgba(139,70,44,0.12)',   text: '#7A3C24', dot: '#8B4A2C' },
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
