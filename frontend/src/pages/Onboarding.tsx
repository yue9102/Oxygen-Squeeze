import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { saveProfile, fetchProfile } from '../api'

export default function Onboarding() {
  const nav = useNavigate()
  const [identity, setIdentity] = useState('')
  const [role, setRole] = useState('')
  const [focusText, setFocusText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')
  const [canGoBack, setCanGoBack] = useState(false)

  // 已有画像（从「我的」进来调整）→ 预填并显示返回键；首次引导则不显示
  useEffect(() => {
    fetchProfile().then(p => {
      if (p.exists !== false) {
        setCanGoBack(true)
        setIdentity(p.identity || '')
        setRole(p.role || '')
        setFocusText((p.focus || []).join('、'))
      }
    }).catch(() => {})
  }, [])

  const canSubmit = identity.trim().length >= 2 && !submitting

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true); setErr('')
    const focus = focusText.split(/[,，、\s]+/).map(s => s.trim()).filter(Boolean)
    try {
      await saveProfile({ identity: identity.trim(), role: role.trim(), focus })
      nav('/', { replace: true })
    } catch (e: any) {
      setErr('生成框架时出错了，再试一次')
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 'var(--safe-top)' }} className="statusbar-safe" />

      {/* 返回键：仅在从「我的」进入调整时显示 */}
      {canGoBack && (
        <div style={{ flexShrink: 0, height: 44, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <button onClick={() => nav('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="9" height="16" viewBox="0 0 9 16" fill="none"><path d="M8 1L1 8l7 7" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: '0.9375rem', color: 'var(--accent)', fontFamily: "'Noto Serif SC',serif", fontWeight: 600 }}>我的</span>
          </button>
        </div>
      )}

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 40px' }}>
        {/* 头部 */}
        <div style={{ width: 52, height: 52, borderRadius: 26, background: 'rgba(92,139,110,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
          <svg width="26" height="26" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="6" fill="var(--accent)"/><circle cx="18" cy="18" r="13" stroke="var(--accent)" strokeWidth="1.5" opacity="0.4"/></svg>
        </div>
        <h1 style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1.75rem', fontWeight: 900, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 8 }}>
          先认识一下你
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--ink-2)', lineHeight: 1.7, marginBottom: 28 }}>
          氧气捏捏会根据你的身份和关注，<br/>为你<span style={{ color: 'var(--accent)', fontWeight: 700 }}>专属生成</span>一套知识框架——<br/>你听的每期播客，都会沉淀进属于你的结构里。
        </p>

        <Field label="你是谁？" hint="一句话介绍你的身份、背景">
          <textarea value={identity} onChange={e => setIdentity(e.target.value)} rows={2}
            placeholder="例：研二学生，工业设计转 AI 产品经理"
            style={inputStyle} />
        </Field>

        <Field label="你的角色 / 职业方向" hint="选填">
          <input value={role} onChange={e => setRole(e.target.value)}
            placeholder="例：AI 产品经理（实习）"
            style={inputStyle} />
        </Field>

        <Field label="你最关注什么？" hint="用逗号分隔几个方向">
          <input value={focusText} onChange={e => setFocusText(e.target.value)}
            placeholder="例：具身智能, 语音大模型, 多模态交互"
            style={inputStyle} />
        </Field>

        {err && <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', marginTop: 4 }}>{err}</p>}
      </div>

      {/* 底部按钮 */}
      <div style={{ flexShrink: 0, padding: '12px 24px calc(20px + env(safe-area-inset-bottom))', borderTop: '0.5px solid var(--sep)', background: 'var(--nav-bg)' }}>
        <button onClick={submit} disabled={!canSubmit}
          style={{
            width: '100%', padding: '14px', borderRadius: 16, border: 'none',
            background: canSubmit ? 'var(--accent)' : 'rgba(92,139,110,0.3)',
            color: '#fff', fontSize: '0.9375rem', fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'default', fontFamily: "'Noto Serif SC',serif",
          }}>
          {submitting ? '正在为你生成专属框架…' : '生成我的知识框架'}
        </button>
      </div>

      <AnimatePresence>
        {submitting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(244,247,242,0.85)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <div className="breathe" style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(92,139,110,0.18)' }} />
            <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.9375rem', color: 'var(--accent)', fontWeight: 600 }}>正在为你生成专属框架…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--ink)' }}>{label}</span>
        {hint && <span style={{ fontSize: '0.6875rem', color: 'var(--ink-3)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#fff', border: '1px solid rgba(92,139,110,0.2)',
  borderRadius: 12, padding: '12px 14px', fontSize: '0.9375rem', color: 'var(--ink)',
  fontFamily: "'Noto Serif SC',serif", outline: 'none', resize: 'none',
  WebkitAppearance: 'none', lineHeight: 1.6,
}
