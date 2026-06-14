import { useLocation, useNavigate } from 'react-router-dom'

function IconListen(active: boolean) {
  const c = active ? 'var(--accent)' : 'var(--ink-3)'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M12 3C7.03 3 3 7.03 3 12v5a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H5v-1a7 7 0 0114 0v1h-1a2 2 0 00-2 2v3a2 2 0 002 2h1a2 2 0 002-2v-5c0-4.97-4.03-9-9-9z"
        fill={c}/>
    </svg>
  )
}

function IconShelf(active: boolean) {
  const c = active ? 'var(--accent)' : 'var(--ink-3)'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="17" width="18" height="2.5" rx="1.25" fill={c}/>
      <rect x="3" y="11.5" width="18" height="2.5" rx="1.25" fill={c} opacity={active ? 1 : 0.65}/>
      <rect x="3" y="6" width="13" height="2.5" rx="1.25" fill={c} opacity={active ? 1 : 0.35}/>
    </svg>
  )
}

function IconHistory(active: boolean) {
  const c = active ? 'var(--accent)' : 'var(--ink-3)'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke={c} strokeWidth="2" fill="none"/>
      <path d="M12 7.5V12l3 2.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconThink(active: boolean) {
  const c = active ? 'var(--accent)' : 'var(--ink-3)'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      {/* 羽毛笔：输出/思考 */}
      <path d="M5 19c0-4 3-9 9-12 2-1 4-1 4-1s0 2-1 4c-3 6-8 9-12 9z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active ? 'rgba(92,139,110,0.12)' : 'none'}/>
      <path d="M5 19s2-3 5-5" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

const tabs = [
  { path: '/',            label: '今日',    renderIcon: IconListen  },
  { path: '/shelf',       label: '知识藏',  renderIcon: IconShelf   },
  { path: '/reflections', label: '我的思考', renderIcon: IconThink   },
  { path: '/history',     label: '听过的',  renderIcon: IconHistory },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const nav = useNavigate()

  return (
    <nav className="ios-tab-bar">
      {tabs.map(t => {
        const active = pathname === t.path || (t.path !== '/' && pathname.startsWith(t.path))
        return (
          <button
            key={t.path}
            onClick={() => nav(t.path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0',
            }}
          >
            {t.renderIcon(active)}
            <span style={{
              fontSize: '0.625rem',
              color: active ? 'var(--accent)' : 'var(--ink-3)',
              fontWeight: active ? 600 : 400,
            }}>
              {t.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
