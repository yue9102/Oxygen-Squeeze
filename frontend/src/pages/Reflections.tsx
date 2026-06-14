import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchReflections, deleteReflection } from '../api'
import BottomNav from '../components/BottomNav'
import NavBar    from '../components/NavBar'
import type { Reflection } from '../types'

export default function Reflections() {
  const [items, setItems] = useState<Reflection[]>([])
  const [loading, setLoading] = useState(true)
  const [openRaw, setOpenRaw] = useState<string | null>(null)

  useEffect(() => {
    fetchReflections().then(d => { setItems(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function remove(id: string) {
    await deleteReflection(id)
    setItems(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <NavBar
        title="我的思考"
        subtitle={items.length > 0 ? `${items.length} 条沉淀下来的思考` : '把听到的，说成自己的'}
      />

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2].map(i => <div key={i} style={{ height: 130, background: 'rgba(92,139,110,0.06)', borderRadius: 16, animation: 'pulse 1.6s ease-in-out infinite' }} />)}
          </div>
        ) : items.length === 0 ? (
          <Empty />
        ) : (
          items.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.28 }}>
              <Card r={r} rawOpen={openRaw === r.id} onToggleRaw={() => setOpenRaw(openRaw === r.id ? null : r.id)} onDelete={() => remove(r.id)} />
            </motion.div>
          ))
        )}
        <div style={{ height: 100 }} />
      </div>

      <BottomNav />
    </div>
  )
}

function Card({ r, rawOpen, onToggleRaw, onDelete }: {
  r: Reflection; rawOpen: boolean; onToggleRaw: () => void; onDelete: () => void
}) {
  const date = new Date(r.created_at)
  return (
    <div style={{
      background: '#fff',
      backgroundImage: 'radial-gradient(ellipse 140% 130% at 25% 10%, #FFFFFF 0%, #F4F8F3 100%)',
      borderRadius: 16, padding: '16px 16px 14px', marginBottom: 12,
      border: '1px solid rgba(92,139,110,0.14)', boxShadow: '0 2px 10px rgba(60,90,60,0.06)',
    }}>
      {/* 来源问题 */}
      <p className="slash-label" style={{ color: 'var(--accent)', marginBottom: 6 }}>/ 回应 /</p>
      <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.8125rem', color: '#6B7D67', lineHeight: 1.5, marginBottom: 12 }}>
        {r.question}
      </p>

      {/* 核心观点 */}
      <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1.0625rem', fontWeight: 700, color: '#2B3826', lineHeight: 1.5, marginBottom: 10 }}>
        {r.conclusion}
      </p>

      {/* 支撑论点 */}
      {r.points.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
          <span style={{ fontFamily: "'Special Elite',monospace", fontSize: '0.625rem', color: 'var(--accent)', marginTop: 3, flexShrink: 0 }}>{String(i+1).padStart(2,'0')}</span>
          <span style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.8125rem', color: '#4A5A46', lineHeight: 1.6 }}>{p}</span>
        </div>
      ))}

      {/* 再追问自己 */}
      {r.open_questions.length > 0 && (
        <div style={{ marginTop: 10, background: 'rgba(92,139,110,0.07)', borderRadius: 10, padding: '10px 12px' }}>
          <p className="slash-label" style={{ color: 'var(--accent)', marginBottom: 6, fontSize: '0.45rem' }}>/ 再追问自己 /</p>
          {r.open_questions.map((q, i) => (
            <p key={i} style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.75rem', color: '#6B7D67', lineHeight: 1.6 }}>· {q}</p>
          ))}
        </div>
      )}

      {/* 底部：来源 + 展开原话 + 删除 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <span style={{ fontSize: '0.625rem', color: 'var(--ink-3)', fontFamily: '-apple-system,system-ui,sans-serif' }}>
          {r.episode_title.slice(0, 14)}{r.episode_title.length > 14 ? '…' : ''} · {date.getMonth()+1}/{date.getDate()}
        </span>
        <div style={{ display: 'flex', gap: 14 }}>
          <button onClick={onToggleRaw} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', color: 'var(--accent)', fontFamily: '-apple-system,system-ui,sans-serif' }}>
            {rawOpen ? '收起原话' : '我的原话'}
          </button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', color: 'var(--ink-3)', fontFamily: '-apple-system,system-ui,sans-serif' }}>删除</button>
        </div>
      </div>

      <AnimatePresence>
        {rawOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
            <div style={{ height: '0.5px', background: 'rgba(92,139,110,0.18)', margin: '12px 0' }} />
            <p style={{ fontSize: '0.75rem', color: '#8A9A84', lineHeight: 1.7, fontStyle: 'italic' }}>
              {r.raw_text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Empty() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 14, padding: '0 40px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(92,139,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M5 19c0-4 3-9 9-12 2-1 4-1 4-1s0 2-1 4c-3 6-8 9-12 9z" stroke="#5C8B6E" strokeWidth="1.6" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1rem', fontWeight: 700, color: '#4A5A46' }}>还没有思考</p>
        <p style={{ fontSize: '0.8125rem', color: '#8A9A84', marginTop: 6, lineHeight: 1.6 }}>
          在播客卡片的「值得想一想」里<br/>用语音回答，思考会沉淀到这里
        </p>
      </div>
    </div>
  )
}
