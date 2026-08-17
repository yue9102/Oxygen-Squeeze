import { useEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchReflections, deleteReflection } from '../api'
import BottomNav from '../components/BottomNav'
import NavBar from '../components/NavBar'
import type { Reflection, ReflectionGuidance } from '../types'

export default function Reflections() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [items, setItems] = useState<Reflection[]>([])
  const [loading, setLoading] = useState(true)
  const [openRaw, setOpenRaw] = useState<string | null>(null)

  useEffect(() => {
    fetchReflections().then(d => { setItems(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function remove(id: string) {
    await deleteReflection(id)
    setItems(prev => prev.filter(r => r.id !== id))
    nav('/reflections', { replace: true })
  }

  const detail = id ? items.find(item => item.id === id) : undefined

  if (id) {
    return <ReflectionDetail
      reflection={detail}
      loading={loading}
      rawOpen={openRaw === id}
      onBack={() => nav('/reflections')}
      onToggleRaw={() => setOpenRaw(openRaw === id ? null : id)}
      onDelete={() => detail && remove(detail.id)}
    />
  }

  const groups = groupByEpisode(items)

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <NavBar
        title="听完的回响"
        subtitle={items.length > 0 ? `${items.length} 条听完后的回响` : '把听到的，说成自己的'}
      />

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2].map(i => <div key={i} style={{ height: 130, background: 'rgba(92,139,110,0.06)', borderRadius: 16, animation: 'pulse 1.6s ease-in-out infinite' }} />)}
          </div>
        ) : items.length === 0 ? (
          <Empty />
        ) : (
          groups.map((group, i) => (
            <motion.div key={group.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.28 }}>
              <EpisodeGroup group={group} onOpen={(reflectionId) => nav(`/reflections/${reflectionId}`)} />
            </motion.div>
          ))
        )}
        <div style={{ height: 100 }} />
      </div>

      <BottomNav />
    </div>
  )
}

type ReflectionGroup = { id: string; title: string; items: Reflection[] }

function groupByEpisode(items: Reflection[]): ReflectionGroup[] {
  const groups = new Map<string, ReflectionGroup>()
  for (const item of items) {
    const id = item.episode_id || item.episode_title || '未分类回响'
    const current = groups.get(id) ?? { id, title: item.episode_title || '未命名播客', items: [] }
    current.items.push(item)
    groups.set(id, current)
  }
  return [...groups.values()]
}

function EpisodeGroup({ group, onOpen }: { group: ReflectionGroup; onOpen: (id: string) => void }) {
  return (
    <section style={{ marginBottom: 14, border: '1px solid rgba(92,139,110,0.14)', borderRadius: 16, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 10px rgba(60,90,60,0.05)' }}>
      <div style={{ padding: '14px 15px 11px', background: 'rgba(92,139,110,0.055)', borderBottom: '1px solid rgba(92,139,110,0.11)' }}>
        <p className="slash-label" style={{ color: 'var(--accent)', marginBottom: 5 }}>/ 一期播客 /</p>
        <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.9375rem', fontWeight: 700, color: '#2B3826', lineHeight: 1.45 }}>{group.title}</p>
        <p style={{ fontSize: '0.6875rem', color: '#8A9A84', marginTop: 4 }}>{group.items.length} 条回响</p>
      </div>
      {group.items.map((item, index) => (
        <button key={item.id} onClick={() => onOpen(item.id)} style={{ width: '100%', textAlign: 'left', display: 'block', border: 'none', borderBottom: index < group.items.length - 1 ? '1px solid rgba(92,139,110,0.1)' : 'none', background: '#fff', cursor: 'pointer', padding: '13px 15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.6875rem', color: '#6B7D67', lineHeight: 1.45, marginBottom: 5 }}>{item.question}</p>
              <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.875rem', fontWeight: 700, color: '#2B3826', lineHeight: 1.55 }}>{item.conclusion || '查看这次回答'}</p>
            </div>
            <span style={{ color: 'var(--accent)', fontSize: '1rem', lineHeight: 1.4, flexShrink: 0 }}>›</span>
          </div>
        </button>
      ))}
    </section>
  )
}

function ReflectionDetail({ reflection, loading, rawOpen, onBack, onToggleRaw, onDelete }: {
  reflection?: Reflection
  loading: boolean
  rawOpen: boolean
  onBack: () => void
  onToggleRaw: () => void
  onDelete: () => void
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, height: 'var(--safe-top)', background: 'var(--nav-bg)' }} />
      <div style={{ flexShrink: 0, minHeight: 44, display: 'flex', alignItems: 'center', padding: '0 16px', background: 'var(--nav-bg)', borderBottom: '0.5px solid var(--sep)' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="9" height="16" viewBox="0 0 9 16" fill="none"><path d="M8 1L1 8l7 7" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ fontSize: '0.9375rem', color: 'var(--accent)', fontFamily: "'Noto Serif SC',serif", fontWeight: 600 }}>回响</span>
        </button>
      </div>
      <div style={{ flexShrink: 0, padding: '15px 20px 14px', background: 'var(--bg)', borderBottom: '0.5px solid var(--sep)' }}>
        <p className="slash-label" style={{ color: 'var(--accent)', marginBottom: 7 }}>/ 回应的问题 /</p>
        <h1 style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.45 }}>
          {reflection?.question || '这一次想回答的问题'}
        </h1>
      </div>
      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 100px' }}>
        {loading ? <div style={{ height: 260, background: 'rgba(92,139,110,0.06)', borderRadius: 16, animation: 'pulse 1.6s ease-in-out infinite' }} /> : reflection ? <Card r={reflection} rawOpen={rawOpen} onToggleRaw={onToggleRaw} onDelete={onDelete} /> : <p style={{ textAlign: 'center', color: '#8A9A84', paddingTop: 80 }}>这条回响已经不存在了</p>}
      </div>
      <BottomNav />
    </div>
  )
}

function Card({ r, rawOpen, onToggleRaw, onDelete }: {
  r: Reflection; rawOpen: boolean; onToggleRaw: () => void; onDelete: () => void
}) {
  if (isGuidanceV1(r.guidance)) {
    return <GuidedCard r={r} guidance={r.guidance} rawOpen={rawOpen} onToggleRaw={onToggleRaw} onDelete={onDelete} />
  }

  return <LegacyCard r={r} rawOpen={rawOpen} onToggleRaw={onToggleRaw} onDelete={onDelete} />
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isGuidanceV1(value: unknown): value is ReflectionGuidance {
  if (!isRecord(value) || value.schema_version !== 'voice_guidance.v1') return false
  if (typeof value.status !== 'string' || typeof value.user_position !== 'string' || typeof value.relevance !== 'string') return false
  if (typeof value.confidence !== 'string' || (value.open_question !== null && typeof value.open_question !== 'string')) return false
  if (!isRecord(value.logic)) return false
  if (!Array.isArray(value.logic.strengths) || !Array.isArray(value.logic.improvements)) return false
  const feedbackIsValid = (item: unknown) => isRecord(item)
    && typeof item.message === 'string'
    && (item.answer_quote === undefined || typeof item.answer_quote === 'string')
  if (!value.logic.strengths.every(feedbackIsValid) || !value.logic.improvements.every(feedbackIsValid)) return false
  if (!isRecord(value.episode_alignment)) return false
  if (!Array.isArray(value.episode_alignment.supported) || !isStringArray(value.episode_alignment.missing_angles)) return false
  const alignmentIsValid = (item: unknown) => isRecord(item)
    && typeof item.message === 'string'
    && (item.basis_text === undefined || typeof item.basis_text === 'string')
  if (!value.episode_alignment.supported.every(alignmentIsValid)) return false
  if (!Array.isArray(value.supplementary_angles) || !isStringArray(value.limitations)) return false
  const angleIsValid = (item: unknown) => isRecord(item)
    && typeof item.angle === 'string'
    && typeof item.why_relevant === 'string'
  if (!value.supplementary_angles.every(angleIsValid)) return false
  if (value.verification_hint !== null) {
    if (!isRecord(value.verification_hint)) return false
    if (typeof value.verification_hint.claim !== 'string' || typeof value.verification_hint.reason !== 'string') return false
    if (typeof value.verification_hint.search_query !== 'string') return false
    if (value.verification_hint.episode_basis_text !== undefined && typeof value.verification_hint.episode_basis_text !== 'string') return false
  }
  if (value.reference_answer !== null) {
    if (!isRecord(value.reference_answer)) return false
    if (typeof value.reference_answer.conclusion !== 'string') return false
    if (!isStringArray(value.reference_answer.points) || !isStringArray(value.reference_answer.ai_additions)) return false
  }
  return true
}

function LegacyCard({ r, rawOpen, onToggleRaw, onDelete }: {
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

function GuidedCard({ r, guidance, rawOpen, onToggleRaw, onDelete }: {
  r: Reflection
  guidance: ReflectionGuidance
  rawOpen: boolean
  onToggleRaw: () => void
  onDelete: () => void
}) {
  const expressionTip = guidance.logic.improvements.find(item => item.message.trim())?.message.trim()
    || guidance.logic.strengths.find(item => item.message.trim())?.message.trim()
  const coreConclusion = r.conclusion.trim() || guidance.user_position.trim()
  const corePoints = r.points.filter(Boolean)
  const referenceConclusion = guidance.reference_answer?.conclusion.trim() || ''
  const referencePoints = guidance.reference_answer?.points.filter(Boolean) || []
  const additionalAngles = [
    ...guidance.supplementary_angles.map(item => item.angle.trim()),
    ...(guidance.reference_answer?.ai_additions ?? []).map(item => item.trim()),
  ].filter((item, index, all) => item && all.indexOf(item) === index).slice(0, 2)
  const openQuestions = [
    ...(guidance.open_question?.trim() ? [guidance.open_question.trim()] : []),
    ...r.open_questions.map(item => item.trim()).filter(Boolean),
  ].filter((item, index, items) => items.indexOf(item) === index).slice(0, 2)
  const verificationHint = guidance.verification_hint
  const hasVerificationHint = Boolean(verificationHint?.claim.trim() && verificationHint.reason.trim())

  return (
    <article style={{
      background: '#fff',
      backgroundImage: 'radial-gradient(ellipse 140% 130% at 25% 10%, #FFFFFF 0%, #F4F8F3 100%)',
      borderRadius: 16, padding: '16px 16px 14px', marginBottom: 12,
      border: '1px solid rgba(92,139,110,0.14)', boxShadow: '0 2px 10px rgba(60,90,60,0.06)',
    }}>
      <p className="slash-label" style={{ color: 'var(--accent)', marginBottom: 6 }}>/ 回应 /</p>
      <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.8125rem', color: '#6B7D67', lineHeight: 1.5 }}>
        {r.question}
      </p>

      {(coreConclusion || corePoints.length > 0) && (
        <GuideSection title="你的核心观点">
          {coreConclusion && (
            <p style={{
              fontFamily: "'Noto Serif SC',serif", fontSize: '1.0625rem', fontWeight: 700,
              color: '#2B3826', lineHeight: 1.55, marginBottom: corePoints.length > 0 ? 10 : 0,
            }}>
              {coreConclusion}
            </p>
          )}
          <NumberedItems items={corePoints} />
        </GuideSection>
      )}

      {(referenceConclusion || referencePoints.length > 0) && guidance.reference_answer && (
        <GuideSection title="完整参考回答">
          {referenceConclusion && (
            <p style={{
              fontFamily: "'Noto Serif SC',serif", fontSize: '0.9375rem', fontWeight: 700,
              color: '#2B3826', lineHeight: 1.6, marginBottom: referencePoints.length > 0 ? 9 : 0,
            }}>
              {referenceConclusion}
            </p>
          )}
          <NumberedItems items={referencePoints} />
        </GuideSection>
      )}

      {(expressionTip || additionalAngles.length > 0 || hasVerificationHint) && (
        <GuideSection title="补充提示">
          {expressionTip && <CompactHint label="表达建议" text={expressionTip} />}
          {additionalAngles.length > 0 && <CompactHint label="可补充视角" text={additionalAngles.join('；')} />}
          {hasVerificationHint && verificationHint && (
            <CompactHint label="待验证" text={`${verificationHint.claim}。${verificationHint.reason}${verificationHint.search_query.trim() ? ` 可搜索：${verificationHint.search_query.trim()}` : ''}`} tone="warm" />
          )}
        </GuideSection>
      )}

      {openQuestions.length > 0 && (
        <div style={{ marginTop: 14, background: 'rgba(92,139,110,0.07)', borderRadius: 10, padding: '10px 12px' }}>
          <p className="slash-label" style={{ color: 'var(--accent)', marginBottom: 6, fontSize: '0.45rem' }}>/ 再追问自己 /</p>
          {openQuestions.map((question, i) => (
            <p key={i} style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.75rem', color: '#6B7D67', lineHeight: 1.6 }}>
              · {question}
            </p>
          ))}
        </div>
      )}

      <GuidedFooter r={r} rawOpen={rawOpen} onToggleRaw={onToggleRaw} onDelete={onDelete} />
    </article>
  )
}

function GuideSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid rgba(92,139,110,0.13)' }}>
      <p className="slash-label" style={{ color: 'var(--accent)', marginBottom: 9, fontSize: '0.45rem' }}>/ {title} /</p>
      {children}
    </section>
  )
}

function CompactHint({ label, text, tone = 'green' }: { label: string; text: string; tone?: 'green' | 'warm' }) {
  const color = tone === 'warm' ? '#7A633A' : '#4A5A46'
  const background = tone === 'warm' ? 'rgba(139,110,60,0.06)' : 'rgba(92,139,110,0.055)'
  return (
    <div style={{ padding: '8px 10px', borderRadius: 9, background, marginBottom: 7 }}>
      <span style={{ color, fontSize: '0.6875rem', fontWeight: 700, marginRight: 7 }}>{label}</span>
      <span style={{ fontFamily: "'Noto Serif SC',serif", color, fontSize: '0.75rem', lineHeight: 1.55 }}>{text}</span>
    </div>
  )
}

function NumberedItems({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
          <span style={{
            fontFamily: "'Special Elite',monospace", fontSize: '0.625rem',
            color: 'var(--accent)', marginTop: 3, flexShrink: 0,
          }}>
            {String(i + 1).padStart(2, '0')}
          </span>
          <span style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.8125rem', color: '#4A5A46', lineHeight: 1.6 }}>
            {item}
          </span>
        </div>
      ))}
    </div>
  )
}

function GuidedFooter({ r, rawOpen, onToggleRaw, onDelete }: {
  r: Reflection
  rawOpen: boolean
  onToggleRaw: () => void
  onDelete: () => void
}) {
  const date = new Date(r.created_at)
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <span style={{ fontSize: '0.625rem', color: 'var(--ink-3)', fontFamily: '-apple-system,system-ui,sans-serif' }}>
          {r.episode_title.slice(0, 14)}{r.episode_title.length > 14 ? '…' : ''} · {date.getMonth() + 1}/{date.getDate()}
        </span>
        <div style={{ display: 'flex', gap: 14 }}>
          <button type="button" onClick={onToggleRaw} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem',
            color: 'var(--accent)', fontFamily: '-apple-system,system-ui,sans-serif',
          }}>
            {rawOpen ? '收起原话' : '我的原话'}
          </button>
          <button type="button" onClick={onDelete} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem',
            color: 'var(--ink-3)', fontFamily: '-apple-system,system-ui,sans-serif',
          }}>删除</button>
        </div>
      </div>

      <AnimatePresence>
        {rawOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ height: '0.5px', background: 'rgba(92,139,110,0.18)', margin: '12px 0' }} />
            <p style={{ fontSize: '0.75rem', color: '#8A9A84', lineHeight: 1.7, fontStyle: 'italic' }}>
              {r.raw_text || '未识别到有效原话'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
        <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1rem', fontWeight: 700, color: '#4A5A46' }}>还没有回响</p>
        <p style={{ fontSize: '0.8125rem', color: '#8A9A84', marginTop: 6, lineHeight: 1.6 }}>
          在播客卡片的「值得想一想」里<br/>用语音回答，回响会沉淀到这里
        </p>
      </div>
    </div>
  )
}
