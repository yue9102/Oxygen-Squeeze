import { useEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchReflections, deleteReflection } from '../api'
import BottomNav from '../components/BottomNav'
import NavBar from '../components/NavBar'
import type { Reflection, ReflectionGuidance } from '../types'

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
  const strengths = guidance.logic.strengths.filter(item => item.message.trim()).slice(0, 2)
  const improvements = guidance.logic.improvements.filter(item => item.message.trim()).slice(0, 2)
  const supported = guidance.episode_alignment.supported.filter(item => item.message.trim()).slice(0, 2)
  const missingAngles = guidance.episode_alignment.missing_angles.filter(Boolean).slice(0, 2)
  const supplementary = guidance.supplementary_angles.filter(item => item.angle.trim()).slice(0, 3)
  const coreConclusion = r.conclusion.trim() || guidance.user_position.trim()
  const corePoints = r.points.filter(Boolean)
  const referenceConclusion = guidance.reference_answer?.conclusion.trim() || ''
  const referencePoints = guidance.reference_answer?.points.filter(Boolean) || []
  const aiAdditions = guidance.reference_answer?.ai_additions.filter(Boolean).slice(0, 3) || []
  const limitations = guidance.limitations.map(item => item.trim()).filter(Boolean).slice(0, 2)
  const openQuestions = [
    ...(guidance.open_question?.trim() ? [guidance.open_question.trim()] : []),
    ...r.open_questions.map(item => item.trim()).filter(Boolean),
  ].filter((item, index, items) => items.indexOf(item) === index).slice(0, 2)
  const verificationHint = guidance.verification_hint
  const hasVerificationHint = Boolean(verificationHint && (
    verificationHint.claim.trim()
    || verificationHint.reason.trim()
    || verificationHint.episode_basis_text?.trim()
    || verificationHint.search_query.trim()
  ))

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

      {(strengths.length > 0 || improvements.length > 0) && (
        <GuideSection title="表达指导">
          <FeedbackItems title="已经讲清的地方" items={strengths} />
          <FeedbackItems title="可以再讲清楚" items={improvements} improvement />
        </GuideSection>
      )}

      {(supported.length > 0 || missingAngles.length > 0) && (
        <GuideSection title="和本期内容的连接">
          {supported.length > 0 && (
            <div style={{ marginBottom: missingAngles.length > 0 ? 12 : 0 }}>
              <MiniTitle>已经连接到</MiniTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {supported.map((item, i) => (
                  <div key={i} style={{ paddingLeft: 10, borderLeft: '2px solid rgba(92,139,110,0.28)' }}>
                    <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.8125rem', color: '#4A5A46', lineHeight: 1.65 }}>
                      {item.message}
                    </p>
                    {item.basis_text?.trim() && (
                      <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.6875rem', color: '#81907C', lineHeight: 1.6, marginTop: 4 }}>
                        本期内容：{item.basis_text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {missingAngles.length > 0 && (
            <div>
              <MiniTitle>尚可补充</MiniTitle>
              <DotItems items={missingAngles} />
            </div>
          )}
        </GuideSection>
      )}

      {hasVerificationHint && verificationHint && <VerificationHintPanel hint={verificationHint} />}

      {supplementary.length > 0 && (
        <GuideSection title="可以补充的角度">
          <p style={{ fontSize: '0.6875rem', color: '#879382', lineHeight: 1.55, marginBottom: 9 }}>
            以下是参考视角，不代表唯一答案
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {supplementary.map((item, i) => (
              <div key={i} style={{ background: 'rgba(92,139,110,0.055)', borderRadius: 9, padding: '9px 10px' }}>
                <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.8125rem', fontWeight: 700, color: '#4A5A46', lineHeight: 1.5 }}>
                  {item.angle}
                </p>
                {item.why_relevant.trim() && (
                  <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.75rem', color: '#6B7D67', lineHeight: 1.6, marginTop: 3 }}>
                    {item.why_relevant}
                  </p>
                )}
              </div>
            ))}
          </div>
        </GuideSection>
      )}

      {(referenceConclusion || referencePoints.length > 0) && guidance.reference_answer && (
        <GuideSection title="参考表达">
          {aiAdditions.length > 0 && (
            <span style={{
              display: 'inline-flex', borderRadius: 10, padding: '3px 8px', marginBottom: 9,
              background: 'rgba(139,110,60,0.09)', color: '#7A633A', fontSize: '0.625rem',
              fontFamily: '-apple-system,system-ui,sans-serif',
            }}>
              含 AI 补充视角
            </span>
          )}
          {referenceConclusion && (
            <p style={{
              fontFamily: "'Noto Serif SC',serif", fontSize: '0.9375rem', fontWeight: 700,
              color: '#2B3826', lineHeight: 1.6, marginBottom: referencePoints.length > 0 ? 9 : 0,
            }}>
              {referenceConclusion}
            </p>
          )}
          <NumberedItems items={referencePoints} />
          {aiAdditions.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 9, borderTop: '1px dashed rgba(139,110,60,0.2)' }}>
              <MiniTitle>AI 补充了这些视角</MiniTitle>
              <DotItems items={aiAdditions} color="#7A633A" />
            </div>
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

      {limitations.length > 0 && (
        <div style={{
          marginTop: 12, padding: '9px 10px', borderRadius: 9,
          background: 'rgba(92,139,110,0.035)', border: '1px dashed rgba(92,139,110,0.13)',
        }}>
          <p className="slash-label" style={{ color: '#879382', marginBottom: 5, fontSize: '0.42rem' }}>/ 关于这次指导 /</p>
          {limitations.map((item, i) => (
            <p key={i} style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.6875rem', color: '#879382', lineHeight: 1.55 }}>
              · {item}
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

function MiniTitle({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#6B7D67', marginBottom: 6 }}>{children}</p>
}

function FeedbackItems({ title, items, improvement = false }: {
  title: string
  items: ReflectionGuidance['logic']['strengths']
  improvement?: boolean
}) {
  if (items.length === 0) return null

  return (
    <div style={{ marginBottom: 11 }}>
      <MiniTitle>{title}</MiniTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: improvement ? '#8B7A5C' : 'var(--accent)', fontSize: '0.6875rem', lineHeight: 1.7, flexShrink: 0 }}>
              {improvement ? '→' : '·'}
            </span>
            <div>
              <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.8125rem', color: '#4A5A46', lineHeight: 1.65 }}>
                {item.message}
              </p>
              {item.answer_quote?.trim() && (
                <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.6875rem', color: '#879382', lineHeight: 1.55, marginTop: 3, fontStyle: 'italic' }}>
                  “{item.answer_quote}”
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function VerificationHintPanel({ hint }: {
  hint: NonNullable<ReflectionGuidance['verification_hint']>
}) {
  return (
    <section style={{
      marginTop: 14, background: 'rgba(139,110,60,0.07)', border: '1px solid rgba(139,110,60,0.14)',
      borderRadius: 11, padding: '11px 12px',
    }}>
      <p className="slash-label" style={{ color: '#7A633A', marginBottom: 9, fontSize: '0.45rem' }}>/ 建议核实 /</p>
      {hint.claim.trim() && <LabelledText label="你提到" text={hint.claim} />}
      {hint.reason.trim() && <LabelledText label="为什么建议核实" text={hint.reason} />}
      {hint.episode_basis_text?.trim() && <LabelledText label="本期内容对照" text={hint.episode_basis_text} />}
      {hint.search_query.trim() && (
        <div style={{ marginTop: 9 }}>
          <p style={{ fontSize: '0.625rem', color: '#8A7651', marginBottom: 5 }}>可复制搜索词</p>
          <p style={{
            background: 'rgba(255,255,255,0.66)', borderRadius: 7, padding: '7px 9px',
            color: '#5F543F', fontSize: '0.75rem', lineHeight: 1.5,
            fontFamily: '-apple-system,system-ui,sans-serif', userSelect: 'text', WebkitUserSelect: 'text',
          }}>
            {hint.search_query}
          </p>
        </div>
      )}
      <p style={{ fontSize: '0.625rem', color: '#8A7651', lineHeight: 1.55, marginTop: 9 }}>
        请结合外部资料自行判断
      </p>
    </section>
  )
}

function LabelledText({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontSize: '0.625rem', color: '#8A7651', marginBottom: 2 }}>{label}</p>
      <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.75rem', color: '#5F543F', lineHeight: 1.6 }}>{text}</p>
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

function DotItems({ items, color = '#6B7D67' }: { items: string[]; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {items.map((item, i) => (
        <p key={i} style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '0.75rem', color, lineHeight: 1.6 }}>· {item}</p>
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
