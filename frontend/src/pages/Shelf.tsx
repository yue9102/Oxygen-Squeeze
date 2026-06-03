import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fetchTopics } from '../api'
import BottomNav from '../components/BottomNav'
import NavBar    from '../components/NavBar'
import type { TopicCard, TopicsResponse, Anchor } from '../types'
import { ANCHORS, ANCHOR_COLOR } from '../types'

export default function Shelf() {
  const nav = useNavigate()
  const [topics, setTopics] = useState<TopicsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTopics()
      .then(d => { setTopics(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const totalCount = topics ? ANCHORS.reduce((s, a) => s + (topics[a]?.length ?? 0), 0) : 0

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      <NavBar
        title="知识书架"
        subtitle={totalCount > 0 ? `${totalCount} 个话题在生长` : '你听过的，都在这里慢慢生长'}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 0' }} className="no-scrollbar">
        {loading ? (
          <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {[1,2].map(s => (
              <div key={s}>
                <div style={{ width: 80, height: 18, borderRadius: 6, background: 'rgba(92,139,110,0.1)', marginBottom: 12 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[1,2].map(i => <div key={i} style={{ height: 120, background: 'rgba(92,139,110,0.06)', borderRadius: 16, animation: 'pulse 1.6s ease-in-out infinite' }} />)}
                </div>
              </div>
            ))}
          </div>
        ) : totalCount === 0 ? (
          <EmptyShelf />
        ) : (
          <div style={{ paddingTop: 8 }}>
            {ANCHORS.map(anchor => (
              <AnchorSection
                key={anchor}
                anchor={anchor}
                cards={topics?.[anchor] ?? []}
                onCardClick={(sub) => nav(`/shelf/topic/${encodeURIComponent(anchor)}/${encodeURIComponent(sub)}`)}
              />
            ))}
          </div>
        )}
        <div style={{ height: 100 }} />
      </div>

      <BottomNav />
    </div>
  )
}

function AnchorSection({ anchor, cards, onCardClick }: {
  anchor: Anchor
  cards: TopicCard[]
  onCardClick: (subtopic: string) => void
}) {
  const color = ANCHOR_COLOR[anchor]

  return (
    <section style={{ marginBottom: 26 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingLeft: 2 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color.dot, flexShrink: 0 }} />
        <h2 style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1.0625rem', fontWeight: 700, color: 'var(--ink)' }}>
          {anchor}
        </h2>
        <span style={{ fontSize: '0.6875rem', color: 'var(--ink-muted)', fontFamily: '-apple-system,system-ui,sans-serif' }}>
          {cards.length > 0 ? `${cards.length} 个话题` : ''}
        </span>
      </div>

      {/* Subtopic cards or empty hint */}
      {cards.length === 0 ? (
        <div style={{
          padding: '16px', borderRadius: 14, border: '1px dashed rgba(92,139,110,0.2)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontFamily: "'Noto Serif SC',serif" }}>
            还没有相关内容
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {cards.map((card, i) => (
            <motion.div
              key={card.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.28, ease: [0.4,0,0.2,1] }}
            >
              <SubtopicCard card={card} color={color} onClick={() => onCardClick(card.name)} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  )
}

function SubtopicCard({ card, color, onClick }: {
  card: TopicCard
  color: { bg: string; text: string; dot: string }
  onClick: () => void
}) {
  const sleeping = card.is_sleeping
  const daysLabel = card.days_since_active === 0 ? '今天' :
    card.days_since_active === 1 ? '昨天' : `${card.days_since_active}天前`

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer', display: 'block',
        background: sleeping ? 'rgba(240,238,234,0.5)' : '#F6F8F4',
        backgroundImage: sleeping ? 'none' : 'radial-gradient(ellipse 140% 140% at 25% 20%, #FAFCF8 0%, #EEF2EB 100%)',
        borderRadius: 16,
        padding: '13px 13px 11px',
        border: `1px solid ${sleeping ? 'rgba(180,170,160,0.18)' : 'rgba(92,139,110,0.14)'}`,
        boxShadow: sleeping ? 'none' : '0 2px 10px rgba(60,90,60,0.07)',
        opacity: sleeping ? 0.72 : 1,
        minHeight: 116,
      }}
    >
      {/* Subtopic name */}
      <p style={{
        fontFamily: "'Noto Serif SC',serif",
        fontSize: '1rem', fontWeight: 700,
        color: sleeping ? '#8A8078' : '#2B3826',
        lineHeight: 1.3, marginBottom: 7,
      }}>
        {card.name}
      </p>

      {/* Preview */}
      <p style={{
        fontSize: '0.6875rem', color: sleeping ? '#A8A098' : '#6B7D67',
        lineHeight: 1.5, marginBottom: 9,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        fontFamily: "'Noto Serif SC',serif",
      } as React.CSSProperties}>
        {card.preview}
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.5rem', color: sleeping ? '#B0A8A0' : '#9AAA94', fontFamily: '-apple-system,system-ui,sans-serif' }}>
          {card.insight_count} 条 · {card.episode_count} 期
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
            background: sleeping ? '#C0B8B0' : color.dot,
          }} />
          <span style={{ fontSize: '0.5rem', color: sleeping ? '#B0A8A0' : color.text, fontFamily: '-apple-system,system-ui,sans-serif' }}>
            {daysLabel}
          </span>
        </div>
      </div>
    </button>
  )
}

function EmptyShelf() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 14, padding: '0 40px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(92,139,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M4 19V6a2 2 0 012-2h12a2 2 0 012 2v13" stroke="#5C8B6E" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M4 19a2 2 0 002 2h12a2 2 0 002-2" stroke="#5C8B6E" strokeWidth="1.5"/>
          <path d="M9 10h6M9 14h4" stroke="#5C8B6E" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div>
        <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1rem', fontWeight: 700, color: '#4A5A46' }}>书架还是空的</p>
        <p style={{ fontSize: '0.8125rem', color: '#8A9A84', marginTop: 6, lineHeight: 1.6 }}>
          听完播客贴入链接<br/>洞察会自动归入这四个大类
        </p>
      </div>
    </div>
  )
}
