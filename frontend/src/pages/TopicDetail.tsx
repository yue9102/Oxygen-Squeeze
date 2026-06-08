import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchTopicDetail } from '../api'
import type { TopicDetail, TopicInsight } from '../types'
import { ANCHOR_COLOR } from '../types'

export default function TopicDetail() {
  const { anchor: anchorParam, subtopic: subParam } = useParams<{ anchor: string; subtopic: string }>()
  const nav = useNavigate()
  const anchorName = decodeURIComponent(anchorParam ?? '')
  const subName = decodeURIComponent(subParam ?? '')

  const [detail, setDetail] = useState<TopicDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    if (!anchorName || !subName) return
    fetchTopicDetail(anchorName, subName)
      .then(d => { setDetail(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [anchorName, subName])

  const color = detail ? (ANCHOR_COLOR[detail.anchor] ?? ANCHOR_COLOR['AI认知']) : ANCHOR_COLOR['AI认知']

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Back nav (compact, no large title needed for detail pages) */}
      <div style={{
        flexShrink: 0, height: 'var(--safe-top)', background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }} />
      <div style={{
        flexShrink: 0, height: 44, display: 'flex', alignItems: 'center',
        padding: '0 16px', background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '0.5px solid var(--sep)',
      }}>
        <button
          onClick={() => nav('/shelf')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <svg width="9" height="16" viewBox="0 0 9 16" fill="none">
            <path d="M8 1L1 8l7 7" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '0.9375rem', color: 'var(--accent)', fontFamily: "'Noto Serif SC',serif", fontWeight: 600 }}>书架</span>
        </button>
      </div>

      {/* Topic title section */}
      {!loading && detail && (
        <div style={{
          flexShrink: 0, padding: '16px 20px 14px',
          background: 'var(--bg)', borderBottom: '0.5px solid var(--sep)',
        }}>
          <span style={{
            display: 'inline-block', fontSize: '0.5rem',
            fontFamily: "'Noto Serif SC',serif", fontWeight: 600, letterSpacing: '0.06em',
            color: color.text, background: color.bg, padding: '2px 8px', borderRadius: 10, marginBottom: 8,
          }}>
            {detail.anchor}
          </span>
          <h1 style={{
            fontFamily: "'Noto Serif SC',serif", fontSize: '1.625rem', fontWeight: 900,
            color: 'var(--ink)', lineHeight: 1.3,
          }}>
            {detail.name}
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: 4 }}>
            {detail.insights.length} 条洞察 · 来自 {new Set(detail.insights.map(i => i.episode_id)).size} 期播客
          </p>
        </div>
      )}

      {/* Insight list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }} className="no-scrollbar">
        {loading ? (
          <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 100, background: 'rgba(92,139,110,0.06)', borderRadius: 14, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : !detail ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.9375rem' }}>找不到这个话题</p>
          </div>
        ) : (
          <div style={{ paddingTop: 14, paddingBottom: 40 }}>
            {detail.insights.map((ins, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.26, ease: [0.4,0,0.2,1] }}
              >
                <InsightRow
                  ins={ins}
                  isLast={i === detail.insights.length - 1}
                  isExpanded={expanded === i}
                  onToggle={() => setExpanded(expanded === i ? null : i)}
                  accentColor={color.text}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function InsightRow({ ins, isLast, isExpanded, onToggle, accentColor }: {
  ins: TopicInsight
  isLast: boolean
  isExpanded: boolean
  onToggle: () => void
  accentColor: string
}) {
  return (
    <div style={{ marginBottom: isLast ? 0 : 10 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          background: '#F6F8F4',
          backgroundImage: 'radial-gradient(ellipse 140% 130% at 20% 10%, #FAFCF8 0%, #EEF2EB 100%)',
          borderRadius: 14,
          padding: '14px 14px',
          border: '1px solid rgba(92,139,110,0.12)',
          boxShadow: '0 1px 6px rgba(60,90,60,0.06)',
          display: 'block',
        }}
      >
        {/* Source + date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{
            fontSize: '0.625rem', fontFamily: '-apple-system,system-ui,sans-serif',
            fontWeight: 600, color: accentColor, letterSpacing: '0.04em',
          }}>
            {ins.podcast_name}
          </span>
          <span style={{ fontSize: '0.5625rem', color: 'var(--ink-muted)', fontFamily: '-apple-system,system-ui,sans-serif' }}>
            {ins.date}
          </span>
        </div>

        {/* Headline */}
        <p style={{
          fontFamily: "'Noto Serif SC',serif", fontSize: '0.9375rem', fontWeight: 700,
          color: '#2B3826', lineHeight: 1.45, marginBottom: isExpanded ? 10 : 0,
        }}>
          {ins.headline}
        </p>

        {/* Expandable body */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4,0,0.2,1] }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ height: '0.5px', background: 'rgba(92,139,110,0.18)', marginBottom: 10 }} />
              <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.8125rem', color: '#6B7D67', lineHeight: 1.75, marginBottom: 10 }}>
                {ins.body}
              </p>
              {ins.pm_relevance && (
                <div style={{ background: 'rgba(92,139,110,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontSize: '0.4375rem', fontFamily: '-apple-system,system-ui,sans-serif', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: accentColor, marginBottom: 5 }}>
                    从我的视角
                  </p>
                  <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.8125rem', color: '#6B7D67', lineHeight: 1.7, fontStyle: 'italic' }}>
                    {ins.pm_relevance}
                  </p>
                </div>
              )}
              {/* Episode source */}
              <button
                onClick={e => { e.stopPropagation(); /* could navigate to episode */ }}
                style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'default', textAlign: 'left' }}
              >
                <p style={{ fontSize: '0.5625rem', color: 'var(--ink-muted)', fontFamily: '-apple-system,system-ui,sans-serif' }}>
                  来自 · {ins.episode_title}
                </p>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expand hint */}
        {!isExpanded && (
          <p style={{ fontSize: '0.5625rem', color: 'var(--ink-muted)', marginTop: 6, fontFamily: '-apple-system,system-ui,sans-serif' }}>
            点击展开 →
          </p>
        )}
      </button>
    </div>
  )
}
