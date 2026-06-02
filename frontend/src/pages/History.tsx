import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import BottomNav from '../components/BottomNav'
import type { Episode } from '../types'

function fmt(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function groupByMonth(episodes: Episode[]) {
  const groups: Record<string, Episode[]> = {}
  for (const ep of episodes) {
    const d = new Date(ep.created_at)
    const key = `${d.getFullYear()}年${d.getMonth() + 1}月`
    if (!groups[key]) groups[key] = []
    groups[key].push(ep)
  }
  return groups
}

export default function History() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading]   = useState(true)
  const nav = useNavigate()

  useEffect(() => {
    fetch('/api/episodes').then(r => r.json()).then(d => { setEpisodes(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const groups = groupByMonth(episodes)

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)' }}>

      <div style={{ height: 54 }} />

      {/* Nav bar */}
      <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '0.5px solid var(--sep)', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <span style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1.0625rem', fontWeight: 700, color: 'var(--ink)' }}>听过的播客</span>
        {episodes.length > 0 && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--ink-3)' }}>{episodes.length} 期</span>}
      </div>

      <div className="no-scrollbar" style={{ position: 'absolute', top: 98, left: 0, right: 0, bottom: 83, overflowY: 'auto', overscrollBehavior: 'contain' }}>

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div className="breathe" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-soft)', margin: '0 auto' }} />
          </div>
        ) : episodes.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', marginBottom: 16 }}>🌊</p>
            <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1.0625rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>还没有记录</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-2)', lineHeight: 1.7 }}>你听过的每一期播客<br/>都会保存在这里</p>
          </div>
        ) : (
          Object.entries(groups).map(([month, eps]) => (
            <div key={month} style={{ marginBottom: 8 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-2)', padding: '16px 20px 8px' }}>{month}</p>
              <div style={{ margin: '0 16px', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 10px rgba(43,56,38,0.07)' }}>
                {eps.map((ep, i) => (
                  <div key={ep.id}>
                    <HistoryRow ep={ep} onClick={() => nav(`/cards/${ep.id}`)} />
                    {i < eps.length - 1 && <div style={{ height: '0.5px', background: 'var(--sep)', marginLeft: 72 }} />}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <div style={{ height: 24 }} />
      </div>

      <BottomNav />
    </div>
  )
}

function HistoryRow({ ep, onClick }: { ep: Episode; onClick: () => void }) {
  return (
    <motion.button whileTap={{ backgroundColor: 'var(--surface-2)' }} onClick={onClick} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>🎧</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, marginBottom: 3 }}>{ep.podcast_name}</p>
        <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.title}</p>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 4, fontSize: '0.75rem', color: 'var(--ink-3)' }}>
          <span>{fmt(ep.created_at)}</span>
          <span style={{ fontSize: '0.375rem' }}>●</span>
          <span>{ep.key_insights.length} 条洞察</span>
          {ep.duration && <><span style={{ fontSize: '0.375rem' }}>●</span><span>{ep.duration}</span></>}
        </div>
      </div>
      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
        <path d="M1 1l5 5-5 5" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </motion.button>
  )
}
