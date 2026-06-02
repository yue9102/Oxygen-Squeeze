import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const STEPS = ['去拿一下…', '帮你想想…', '整理好了！']

interface Props {
  open: boolean
  onClose: () => void
  onDone: (id: string) => void
}

export default function UrlSheet({ open, onClose, onDone }: Props) {
  const [url, setUrl]         = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep]       = useState(0)
  const [error, setError]     = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setUrl(''); setError(''); setLoading(false); setStep(0)
      setTimeout(() => inputRef.current?.focus(), 350)
    }
  }, [open])

  async function handleSubmit() {
    if (!url.trim() || loading) return
    setLoading(true); setError(''); setStep(0)

    const t1 = setTimeout(() => setStep(1), 1400)
    const t2 = setTimeout(() => setStep(2), 5500)

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || '出了一点问题')
      clearTimeout(t1); clearTimeout(t2)
      onDone(data.episode.id)
    } catch (e: any) {
      clearTimeout(t1); clearTimeout(t2)
      setError(e.message || '好像出了一点问题，再试一次吧')
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'absolute', inset: 0, background: 'rgba(20,27,18,0.35)',
              zIndex: 40, backdropFilter: 'blur(4px)',
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.9 }}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: '#fff',
              borderRadius: '24px 24px 0 0',
              zIndex: 50,
              paddingBottom: 34,
            }}
          >
            {/* Handle */}
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: 'var(--ink-3)', margin: '12px auto 0',
            }} />

            <div style={{ padding: '20px 20px 0' }}>
              <h2 style={{
                fontFamily: "'Noto Serif SC', serif",
                fontSize: '1.25rem', fontWeight: 700,
                color: 'var(--ink)', marginBottom: 16,
              }}>
                贴入播客链接
              </h2>

              {!loading ? (
                <>
                  <input
                    ref={inputRef}
                    value={url}
                    onChange={e => { setUrl(e.target.value); setError('') }}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="小宇宙或 Apple Podcasts 链接"
                    style={{
                      width: '100%', padding: '13px 14px',
                      background: 'var(--surface-2)',
                      border: 'none', borderRadius: 12,
                      fontSize: '0.9375rem', color: 'var(--ink)',
                      outline: 'none',
                    }}
                  />

                  {error && (
                    <p style={{
                      fontSize: '0.8125rem', color: 'var(--danger)',
                      marginTop: 10, lineHeight: 1.5,
                    }}>
                      {error}
                    </p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={!url.trim()}
                    className="btn-accent"
                    style={{ marginTop: 14 }}
                  >
                    帮我整理一下
                  </button>

                  <p style={{
                    fontSize: '0.75rem', color: 'var(--ink-3)',
                    textAlign: 'center', marginTop: 12,
                  }}>
                    支持小宇宙 / Apple Podcasts
                  </p>
                </>
              ) : (
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  {/* Breathing loader */}
                  <div className="breathe" style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'var(--accent-soft)',
                    margin: '0 auto 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3C7.03 3 3 7.03 3 12v5a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H5v-1a7 7 0 0114 0v1h-1a2 2 0 00-2 2v3a2 2 0 002 2h1a2 2 0 002-2v-5c0-4.97-4.03-9-9-9z"
                        fill="var(--accent)"/>
                    </svg>
                  </div>

                  <p style={{
                    fontFamily: "'Noto Serif SC', serif",
                    fontSize: '1rem', color: 'var(--ink)',
                    marginBottom: 20,
                  }}>
                    {STEPS[step]}
                  </p>

                  {/* Step dots */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                    {STEPS.map((label, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                          width: i === step ? 24 : 6, height: 6, borderRadius: 3,
                          background: i <= step ? 'var(--accent)' : 'var(--surface-2)',
                          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }} />
                        <span style={{
                          fontSize: '0.625rem', color: i <= step ? 'var(--accent)' : 'var(--ink-3)',
                        }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
