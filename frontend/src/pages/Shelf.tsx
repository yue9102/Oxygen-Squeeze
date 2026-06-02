import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import BottomNav from '../components/BottomNav'

const CATEGORY_EMOJI: Record<string, string> = {
  '技术趋势': '🌿', '产品设计': '🎋', '行业动态': '🌊',
  '具身智能': '🌱', '商业模式': '🍃',
}

interface FrameworkItem { text: string; date: string; source: string; episode_title: string }
type Framework = Record<string, FrameworkItem[]>

export default function Shelf() {
  const [fw, setFw]               = useState<Framework>({})
  const [open, setOpen]           = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/framework').then(r => r.json()).then(d => { setFw(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const total = Object.values(fw).reduce((s, v) => s + v.length, 0)
  const max   = Math.max(...Object.values(fw).map(v => v.length), 1)

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)' }}>

      {/* Status */}
      <div style={{ height: 54 }} />

      {/* Nav bar */}
      <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '0.5px solid var(--sep)', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <span style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1.0625rem', fontWeight: 700, color: 'var(--ink)' }}>知识藏着呢</span>
        {total > 0 && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--ink-3)' }}>共 {total} 条</span>}
      </div>

      {/* Body */}
      <div className="no-scrollbar" style={{ position: 'absolute', top: 98, left: 0, right: 0, bottom: 83, overflowY: 'auto', overscrollBehavior: 'contain' }}>

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div className="breathe" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-soft)', margin: '0 auto' }} />
          </div>
        ) : total === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', marginBottom: 16 }}>🌱</p>
            <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1.0625rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>书架还空着呢</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-2)', lineHeight: 1.7 }}>每次听完播客整理的洞察<br/>会慢慢积累到这里来</p>
          </div>
        ) : (
          <>
            <div style={{ padding: '16px 16px 8px' }}>
              <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 10px rgba(43,56,38,0.07)' }}>
                {Object.entries(fw).map(([cat, items], i, arr) => (
                  <div key={cat}>
                    <CategoryRow cat={cat} items={items} max={max} isOpen={open === cat} onToggle={() => setOpen(open === cat ? null : cat)} />
                    {i < arr.length - 1 && <div style={{ height: '0.5px', background: 'var(--sep)', marginLeft: 56 }} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--ink-3)', padding: '16px 0 8px' }}>
              已沉淀 {total} 条知识
            </p>
          </>
        )}
        <div style={{ height: 24 }} />
      </div>

      <BottomNav />
    </div>
  )
}

function CategoryRow({ cat, items, max, isOpen, onToggle }: { cat: string; items: FrameworkItem[]; max: number; isOpen: boolean; onToggle: () => void }) {
  const pct = max > 0 ? items.length / max : 0
  const emoji = CATEGORY_EMOJI[cat] || '🍀'

  return (
    <div>
      <motion.button whileTap={{ backgroundColor: 'var(--surface-2)' }} onClick={onToggle} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Emoji */}
        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', flexShrink: 0 }}>{emoji}</div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)' }}>{cat}</span>
            <span style={{ fontSize: '0.75rem', color: items.length > 0 ? 'var(--accent)' : 'var(--ink-3)', fontWeight: 600 }}>
              {items.length} 条
            </span>
          </div>
          {/* Thickness bar */}
          <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-2)', overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} style={{ height: '100%', borderRadius: 2, background: pct > 0 ? 'var(--accent)' : 'transparent' }} />
          </div>
          {items.length > 0 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{items[items.length - 1].text}</p>
          )}
        </div>

        {items.length > 0 && (
          <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0, opacity: 0.35 }}>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </motion.div>
        )}
      </motion.button>

      {/* Expanded insights */}
      {isOpen && items.length > 0 && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', background: 'var(--accent-soft)' }}>
          {items.map((item, i) => (
            <div key={i} style={{ padding: '10px 16px 10px 64px', borderTop: i > 0 ? '0.5px solid rgba(92,139,110,0.15)' : 'none' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--ink)', lineHeight: 1.55, marginBottom: 4 }}>{item.text}</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--ink-3)' }}>{item.date} · {item.source}</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
