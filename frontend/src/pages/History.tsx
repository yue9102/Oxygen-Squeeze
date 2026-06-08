import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import BottomNav from '../components/BottomNav'
import NavBar    from '../components/NavBar'
import { deleteEpisode, apiUrl } from '../api'
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
  const [editing, setEditing]   = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const nav = useNavigate()

  useEffect(() => {
    fetch(apiUrl('/api/episodes'))
      .then(r => r.json())
      .then(d => { setEpisodes(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteEpisode(id)
      setEpisodes(prev => prev.filter(e => e.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  const groups = groupByMonth(episodes)

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      <NavBar
        title="听过的"
        subtitle={episodes.length > 0 ? `共 ${episodes.length} 期，都收在这里` : '你听过的每一期，都收在这里'}
        rightAction={episodes.length > 0 ? (
          <button
            onClick={() => setEditing(e => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontSize: '0.9375rem', color: 'var(--accent)', fontFamily: "'Noto Serif SC',serif", fontWeight: 600 }}
          >
            {editing ? '完成' : '编辑'}
          </button>
        ) : undefined}
      />

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div className="breathe" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-soft)', margin: '0 auto' }} />
          </div>
        ) : episodes.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', marginBottom: 16 }}>🌊</p>
            <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1.0625rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
              还没有记录
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-2)', lineHeight: 1.7 }}>
              你听过的每一期播客<br/>都会保存在这里
            </p>
          </div>
        ) : (
          Object.entries(groups).map(([month, eps]) => (
            <div key={month} style={{ marginBottom: 8 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-2)', padding: '16px 20px 8px' }}>
                {month}
              </p>
              <div style={{ margin: '0 16px', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 10px rgba(43,56,38,0.07)' }}>
                {eps.map((ep, i) => (
                  <div key={ep.id}>
                    <HistoryRow
                      ep={ep}
                      editing={editing}
                      deleting={deleting === ep.id}
                      onClick={() => !editing && nav(`/cards/${ep.id}`)}
                      onDelete={() => handleDelete(ep.id)}
                    />
                    {i < eps.length - 1 && (
                      <div style={{ height: '0.5px', background: 'var(--sep)', marginLeft: editing ? 16 : 72 }} />
                    )}
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

function HistoryRow({ ep, editing, deleting, onClick, onDelete }: {
  ep: Episode; editing: boolean; deleting: boolean
  onClick: () => void; onDelete: () => void
}) {
  return (
    <motion.div
      layout
      style={{ display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}
    >
      {/* Delete button (editing mode) */}
      <motion.button
        initial={false}
        animate={{ width: editing ? 28 : 0, opacity: editing ? 1 : 0 }}
        transition={{ duration: 0.22, ease: [0.4,0,0.2,1] }}
        onClick={onDelete}
        disabled={deleting}
        style={{
          flexShrink: 0, overflow: 'hidden', padding: 0, border: 'none', cursor: 'pointer',
          background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{ width: 22, height: 22, borderRadius: 11, background: '#E05454', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {deleting
            ? <div style={{ width: 8, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.6)' }} />
            : <svg width="10" height="2" viewBox="0 0 10 2" fill="none"><path d="M1 1h8" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          }
        </div>
      </motion.button>

    <motion.button
      whileTap={!editing ? { backgroundColor: 'var(--surface-2)' } : {}}
      onClick={onClick}
      style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: editing ? 'default' : 'pointer', padding: '13px 0', display: 'flex', alignItems: 'center', gap: 12 }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
        🎧
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, marginBottom: 3 }}>
          {ep.podcast_name}
        </p>
        <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ep.title}
        </p>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 4, fontSize: '0.75rem', color: 'var(--ink-3)' }}>
          <span>{fmt(ep.created_at)}</span>
          <span style={{ fontSize: '0.375rem' }}>●</span>
          <span>{ep.key_insights.length} 条洞察</span>
          {ep.duration && <><span style={{ fontSize: '0.375rem' }}>●</span><span>{ep.duration}</span></>}
        </div>
      </div>
      {!editing && (
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
          <path d="M1 1l5 5-5 5" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </motion.button>
    </motion.div>
  )
}
