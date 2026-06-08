import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import BottomNav from '../components/BottomNav'
import NavBar    from '../components/NavBar'
import UrlSheet  from '../components/UrlSheet'
import { apiUrl } from '../api'
import type { Episode } from '../types'

function formatDate(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 86400)  return '今天'
  if (diff < 172800) return '昨天'
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export default function Home() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [episodes, setEpisodes]   = useState<Episode[]>([])
  const nav = useNavigate()

  function load() { fetch(apiUrl('/api/episodes')).then(r => r.json()).then(setEpisodes).catch(() => {}) }
  useEffect(load, [])

  function onDone(id: string) { setSheetOpen(false); load(); setTimeout(() => nav(`/cards/${id}`), 320) }

  const addButton = (
    <button onClick={() => setSheetOpen(true)} style={{ width: 34, height: 34, borderRadius: 17, background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(92,139,110,0.4)' }}>
      <svg width="17" height="17" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
    </button>
  )

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      <NavBar title="今天听了什么呀" subtitle="贴一条链接，捏出今天的收获" rightAction={addButton} />

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
        <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
          {episodes.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 40 }}>
              <EmptyState onAdd={() => setSheetOpen(true)} />
            </div>
          ) : (
            <>
              <EpisodeList episodes={episodes} onAdd={() => setSheetOpen(true)} />
              <div style={{ height: 24 }} />
            </>
          )}
        </div>
      </div>

      <BottomNav />
      <UrlSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onDone={onDone} />
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ padding: '0 24px', textAlign: 'center' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent-soft)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d="M18 4C11.37 4 6 9.37 6 16v7a3 3 0 003 3h1.5a3 3 0 003-3v-4a3 3 0 00-3-3H9v-1.5a9 9 0 0118 0V16h-1.5a3 3 0 00-3 3v4a3 3 0 003 3H27a3 3 0 003-3v-7c0-6.63-5.37-12-12-12z" fill="var(--accent)"/>
        </svg>
      </div>
      <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1.125rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>还没有内容呀</p>
      <p style={{ fontSize: '0.875rem', color: 'var(--ink-2)', lineHeight: 1.7, marginBottom: 32 }}>听完一期播客，把链接贴进来<br/>让氧气帮你整理知识精华</p>
      <button onClick={onAdd} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 22, cursor: 'pointer', padding: '13px 32px', fontSize: '0.9375rem', fontWeight: 600, boxShadow: '0 4px 18px rgba(92,139,110,0.35)' }}>贴入第一条链接</button>
    </motion.div>
  )
}

function EpisodeList({ episodes, onAdd }: { episodes: Episode[]; onAdd: () => void }) {
  const nav = useNavigate()
  return (
    <div style={{ paddingBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 10px' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-2)' }}>最近听过</span>
        <button onClick={onAdd} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600 }}>+ 新增</button>
      </div>
      <div style={{ margin: '0 16px', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 10px rgba(43,56,38,0.07)' }}>
        {episodes.slice(0, 8).map((ep, i) => (
          <div key={ep.id}>
            <EpisodeRow ep={ep} onClick={() => nav(`/cards/${ep.id}`)} />
            {i < Math.min(episodes.length, 8) - 1 && <div style={{ height: '0.5px', background: 'var(--sep)', marginLeft: 72 }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function EpisodeRow({ ep, onClick }: { ep: Episode; onClick: () => void }) {
  return (
    <motion.button onClick={onClick} whileTap={{ backgroundColor: 'var(--surface-2)' }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem' }}>🎧</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, marginBottom: 3 }}>{ep.podcast_name}</p>
        <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{ep.title}</p>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 4, fontSize: '0.75rem', color: 'var(--ink-3)' }}>
          <span>{formatDate(ep.created_at)}</span>
          <span style={{ fontSize: '0.375rem' }}>●</span>
          <span>{ep.key_insights.length} 条洞察</span>
        </div>
      </div>
      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
        <path d="M1 1l5 5-5 5" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </motion.button>
  )
}
