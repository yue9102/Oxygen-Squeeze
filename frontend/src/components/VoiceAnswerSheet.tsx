import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createReflection } from '../api'
import type { Reflection } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  episodeId: string
  episodeTitle: string
  podcastName: string
  question: string
  onSaved: (r: Reflection) => void
}

type Phase = 'idle' | 'recording' | 'uploading' | 'done' | 'error'

function pickMime(): { mime: string; ext: string } {
  // iOS Safari → mp4/aac；Chrome → webm/opus
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('audio/mp4')) return { mime: 'audio/mp4', ext: 'm4a' }
    if (MediaRecorder.isTypeSupported('audio/webm')) return { mime: 'audio/webm', ext: 'webm' }
  }
  return { mime: '', ext: 'm4a' }
}

export default function VoiceAnswerSheet({ open, onClose, episodeId, episodeTitle, podcastName, question, onSaved }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [secs, setSecs] = useState(0)
  const [err, setErr] = useState('')
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const extRef = useRef('m4a')

  useEffect(() => {
    if (open) { setPhase('idle'); setSecs(0); setErr('') }
    return () => stopTracks()
  }, [open])

  function stopTracks() {
    if (timerRef.current) clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const { mime, ext } = pickMime()
      extRef.current = ext
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
      rec.start()
      recRef.current = rec
      setPhase('recording'); setSecs(0)
      timerRef.current = setInterval(() => setSecs(s => s + 1), 1000)
    } catch {
      setErr('需要麦克风权限，请在系统设置里允许')
      setPhase('error')
    }
  }

  async function stopAndUpload() {
    const rec = recRef.current
    if (!rec) return
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('uploading')
    const done = new Promise<Blob>(resolve => {
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: rec.mimeType || 'audio/mp4' }))
    })
    rec.stop()
    stopTracks()
    const blob = await done
    try {
      const reflection = await createReflection({
        audio: blob, filename: `answer.${extRef.current}`,
        episode_id: episodeId, episode_title: episodeTitle, podcast_name: podcastName, question,
      })
      setPhase('done')
      onSaved(reflection)
      setTimeout(onClose, 900)
    } catch (e: any) {
      setErr(e?.response?.data?.detail || '整理失败，再试一次')
      setPhase('error')
    }
  }

  const mmss = `${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={phase === 'uploading' ? undefined : onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(20,30,18,0.45)', zIndex: 60 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 61,
              background: 'var(--bg)', borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: '22px 24px calc(28px + env(safe-area-inset-bottom))',
              boxShadow: '0 -8px 40px rgba(20,30,18,0.25)',
            }}>
            {/* grabber */}
            <div style={{ width: 38, height: 4, borderRadius: 2, background: 'rgba(92,139,110,0.25)', margin: '0 auto 18px' }} />

            <p className="slash-label" style={{ color: 'var(--accent)', marginBottom: 8 }}>/ 值得想一想 /</p>
            <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.9375rem', fontWeight: 700, color: '#2B3826', lineHeight: 1.5, marginBottom: 22 }}>
              {question}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, minHeight: 130, justifyContent: 'center' }}>
              {phase === 'idle' && (
                <>
                  <button onClick={startRec} style={recBtn('var(--accent)')}>
                    <MicIcon />
                  </button>
                  <p style={{ fontSize: '0.8125rem', color: '#8A9A84' }}>点一下，说出你的想法</p>
                </>
              )}
              {phase === 'recording' && (
                <>
                  <button onClick={stopAndUpload} style={recBtn('#C0584A')} className="breathe">
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: '#fff' }} />
                  </button>
                  <p style={{ fontFamily: "'Special Elite',monospace", fontSize: '1rem', color: '#C0584A' }}>{mmss}</p>
                  <p style={{ fontSize: '0.75rem', color: '#8A9A84' }}>说完点一下方块，帮你整理</p>
                </>
              )}
              {phase === 'uploading' && (
                <>
                  <div className="breathe" style={{ width: 64, height: 64, borderRadius: 32, background: 'rgba(92,139,110,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MicIcon />
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600 }}>正在听你说、帮你理清逻辑…</p>
                  <p style={{ fontSize: '0.75rem', color: '#8A9A84' }}>约十几秒</p>
                </>
              )}
              {phase === 'done' && (
                <>
                  <div style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600 }}>已沉淀到「我的思考」</p>
                </>
              )}
              {phase === 'error' && (
                <>
                  <p style={{ fontSize: '0.875rem', color: '#C0584A' }}>{err}</p>
                  <button onClick={() => setPhase('idle')} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 18, padding: '8px 20px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>再试一次</button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function recBtn(bg: string): React.CSSProperties {
  return {
    width: 72, height: 72, borderRadius: 36, background: bg, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 6px 20px rgba(92,139,110,0.4)',
  }
}

function MicIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="#fff"/>
      <path d="M6 11a6 6 0 0012 0M12 17v3" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
