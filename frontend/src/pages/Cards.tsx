import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { apiUrl } from '../api'
import type { Episode } from '../types'

type CardData =
  | { kind: 'cover';     ep: Episode }
  | { kind: 'summary';   ep: Episode }
  | { kind: 'insight';   ep: Episode; index: number }
  | { kind: 'questions'; ep: Episode }
  | { kind: 'framework'; ep: Episode }

function buildCards(ep: Episode): CardData[] {
  return [
    { kind: 'cover',     ep },
    { kind: 'summary',   ep },
    ...ep.key_insights.map((_, i) => ({ kind: 'insight' as const, ep, index: i })),
    { kind: 'questions', ep },
    { kind: 'framework', ep },
  ]
}

const variants = {
  enter:  { opacity: 0, y: 16, scale: 0.97 },
  center: { opacity: 1, y: 0,  scale: 1 },
  exit:   { opacity: 0, y: -10, scale: 1.01 },
}

/* ── 氧气捏捏 paper card style ── */
const PAPER: React.CSSProperties = {
  background: '#FFFFFF',
  backgroundImage: 'radial-gradient(ellipse 130% 120% at 35% 30%, #FFFFFF 0%, #F4F8F3 100%)',
  boxShadow: '0 10px 30px rgba(60,90,60,0.14), 0 2px 8px rgba(60,90,60,0.08), inset 0 0 0 0.5px rgba(92,139,110,0.12)',
  borderRadius: 20,
  padding: '28px 24px',
  minHeight: 400,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
}

const SLASH: React.CSSProperties = {
  fontFamily: "'Special Elite', monospace",
  fontSize: '0.5625rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
}

const RULE: React.CSSProperties = {
  border: 'none', height: '0.5px',
  background: 'rgba(92,139,110,0.22)',
  margin: '14px 0',
}

const RULE_DOT: React.CSSProperties = {
  border: 'none',
  borderTop: '1px dashed rgba(92,139,110,0.25)',
  margin: '14px 0',
}

export default function Cards() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(apiUrl(`/api/episodes/${id}`)).then(r => r.json()).then(ep => { setEpisode(ep); setLoading(false) })
  }, [id])

  if (loading || !episode) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: 'var(--reader-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="breathe" style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(92,139,110,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
            <path d="M18 4C11.37 4 6 9.37 6 16v7a3 3 0 003 3h1.5a3 3 0 003-3v-4a3 3 0 00-3-3H9v-1.5a9 9 0 0118 0V16h-1.5a3 3 0 00-3 3v4a3 3 0 003 3H27a3 3 0 003-3v-7c0-6.63-5.37-12-12-12z" fill="var(--accent)"/>
          </svg>
        </div>
      </div>
    )
  }

  const cards = buildCards(episode)
  const total = cards.length

  function goNext() { if (idx < total - 1) setIdx(i => i + 1); else nav('/') }
  function goPrev(e: React.MouseEvent) { e.stopPropagation(); if (idx > 0) setIdx(i => i - 1) }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--reader-bg)' }} onClick={goNext}>

      {/* Subtle paper grain over the soft sage background */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(92,139,110,1)', filter: 'url(#grain)', opacity: 0.03, pointerEvents: 'none' }} />

      {/* Close button */}
      <button
        onClick={e => { e.stopPropagation(); nav('/') }}
        style={{
          position: 'absolute', top: 'calc(var(--safe-top) + 4px)', left: 20, zIndex: 50,
          width: 34, height: 34, borderRadius: 17,
          background: 'rgba(92,139,110,0.18)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 1l10 10M11 1L1 11" stroke="rgba(92,139,110,0.9)" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Episode name in top right */}
      <div style={{ position: 'absolute', top: 'calc(var(--safe-top) + 4px)', right: 20, zIndex: 50, maxWidth: 180 }}>
        <p style={{ fontSize: '0.6875rem', color: 'rgba(92,139,110,0.6)', textAlign: 'right', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {episode.podcast_name}
        </p>
      </div>

      {/* Card */}
      <div style={{ position: 'absolute', top: 98, left: 0, right: 0, bottom: 80, display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
            style={{ width: '100%' }}
            className="card-grain"
          >
            <PaperCard card={cards[idx]} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }} onClick={e => e.stopPropagation()}>
        <button onClick={goPrev} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', opacity: idx > 0 ? 0.6 : 0 }}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7l6 6" stroke="rgba(92,139,110,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        {cards.map((_, i) => (
          <button key={i} onClick={e => { e.stopPropagation(); setIdx(i) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <motion.div
              animate={{ width: i === idx ? 22 : 6, background: i === idx ? 'var(--accent)' : 'rgba(92,139,110,0.25)' }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ height: 6, borderRadius: 3 }}
            />
          </button>
        ))}

        <button onClick={goNext} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', opacity: 0.6 }}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="rgba(92,139,110,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  )
}

function PaperCard({ card }: { card: CardData }) {
  const ep = card.ep

  if (card.kind === 'cover') return (
    <div style={PAPER}>
      <span style={{ ...SLASH, color: 'var(--accent)' }}>/ {ep.podcast_name} /</span>
      <p style={{ fontFamily: "'Special Elite',monospace", fontSize: '0.45rem', color: '#B4C5AE', letterSpacing: '0.1em', marginTop: 6 }}>
        {ep.duration && `${ep.duration} · `}{new Date(ep.created_at).toLocaleDateString('zh-CN')}
      </p>
      <div style={{ ...RULE, marginTop: 'auto' }} />
      <h2 style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1.75rem', fontWeight: 900, color: '#2B3826', lineHeight: 1.38, textWrap: 'balance' } as React.CSSProperties}>
        {ep.title}
      </h2>
    </div>
  )

  if (card.kind === 'summary') return (
    <div style={PAPER}>
      <p style={{ ...SLASH, color: '#B4C5AE' }}>/ 这一期的核心 /</p>
      <div style={RULE} />
      <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1.75rem', fontWeight: 900, color: '#2B3826', lineHeight: 1.38, flex: 1, display: 'flex', alignItems: 'center', textWrap: 'balance' } as React.CSSProperties}>
        {ep.summary}
      </p>
    </div>
  )

  if (card.kind === 'insight') {
    const ins = ep.key_insights[card.index]
    return (
      <div style={PAPER}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: "'Special Elite',monospace", fontSize: '2.5rem', color: 'rgba(92,139,110,0.18)', lineHeight: 1 }}>
            0{card.index + 1}
          </span>
          <span style={{ ...SLASH, color: '#B4C5AE' }}>/ 洞察 /</span>
        </div>
        <div style={RULE} />
        <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1.0625rem', fontWeight: 700, color: '#2B3826', lineHeight: 1.55, textWrap: 'balance' } as React.CSSProperties}>
          {ins.headline}
        </p>
        <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.8125rem', color: '#6B7D67', lineHeight: 1.78, marginTop: 10 }}>
          {ins.body}
        </p>
        <div style={RULE_DOT} />
        <p style={{ ...SLASH, color: 'var(--accent)', marginBottom: 8 }}>/ 从我的视角 /</p>
        <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.8125rem', color: '#6B7D67', lineHeight: 1.72, fontStyle: 'italic' }}>
          {ins.pm_relevance}
        </p>
      </div>
    )
  }

  if (card.kind === 'questions') return (
    <div style={PAPER}>
      <p style={{ ...SLASH, color: 'var(--accent)' }}>/ 今天值得想一想 /</p>
      <div style={RULE} />
      {ep.reflection_questions.map((q, i) => (
        <div key={i}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <span style={{ fontFamily: "'Special Elite',monospace", fontSize: '0.5rem', color: 'var(--accent)', paddingTop: 3, opacity: 0.7, flexShrink: 0 }}>
              {['一','二','三'][i] ?? i+1}
            </span>
            <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.875rem', color: '#2B3826', lineHeight: 1.7, flex: 1 }}>{q}</p>
          </div>
          {i < ep.reflection_questions.length - 1 && <div style={RULE_DOT} />}
        </div>
      ))}
    </div>
  )

  if (card.kind === 'framework') {
    const entries = Object.entries(ep.framework_updates).filter(([, v]) => v.length > 0)
    return (
      <div style={PAPER}>
        <p style={{ ...SLASH, color: 'var(--accent)' }}>/ 认知框架更新了 /</p>
        <div style={RULE} />
        {entries.length === 0 ? (
          <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.875rem', color: '#B4C5AE', lineHeight: 1.7, flex: 1, display: 'flex', alignItems: 'center' }}>
            这期没有新的框架更新，但读过就是留下了什么。
          </p>
        ) : entries.map(([cat, items], ci) => (
          <div key={cat} style={{ marginBottom: ci < entries.length - 1 ? 4 : 0 }}>
            <p style={{ ...SLASH, color: '#B4C5AE', fontSize: '0.4375rem', marginBottom: 8 }}>/ {cat} /</p>
            {items.map((item, ii) => (
              <div key={ii} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontFamily: "'Special Elite',monospace", fontSize: '0.5rem', color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}>→</span>
                <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.8125rem', color: '#2B3826', lineHeight: 1.6, flex: 1 }}>{item}</p>
              </div>
            ))}
            {ci < entries.length - 1 && <div style={RULE_DOT} />}
          </div>
        ))}
      </div>
    )
  }

  return null
}
