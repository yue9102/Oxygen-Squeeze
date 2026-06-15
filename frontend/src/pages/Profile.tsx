import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fetchProfile, fetchStats, fetchEpisodes, deleteEpisode } from '../api'
import BottomNav from '../components/BottomNav'
import NavBar    from '../components/NavBar'
import type { Profile as ProfileT, Stats, Episode } from '../types'

function fmt(iso: string) { const d = new Date(iso); return `${d.getMonth()+1}月${d.getDate()}日` }

export default function Profile() {
  const nav = useNavigate()
  const [profile, setProfile] = useState<ProfileT | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    fetchProfile().then(p => setProfile(p.exists === false ? null : p)).catch(() => {})
    fetchStats().then(setStats).catch(() => {})
    fetchEpisodes().then(setEpisodes).catch(() => {})
  }, [])

  async function handleDelete(id: string) {
    await deleteEpisode(id)
    setEpisodes(prev => prev.filter(e => e.id !== id))
    fetchStats().then(setStats).catch(() => {})
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <NavBar
        title="我的"
        subtitle={profile?.identity ? undefined : '设置你的身份，生成专属框架'}
        rightAction={episodes.length > 0 ? (
          <button onClick={() => setEditing(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontSize: '0.9375rem', color: 'var(--accent)', fontFamily: "'Noto Serif SC',serif", fontWeight: 600 }}>
            {editing ? '完成' : '编辑'}
          </button>
        ) : undefined}
      />

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
        {/* 身份卡 */}
        <div style={{ margin: '14px 16px 0', background: '#fff', backgroundImage: 'radial-gradient(ellipse 140% 130% at 20% 0%, #FFFFFF 0%, #F1F6F0 100%)', borderRadius: 18, padding: '18px 18px 16px', border: '1px solid rgba(92,139,110,0.14)', boxShadow: '0 2px 12px rgba(60,90,60,0.07)' }}>
          {profile?.identity ? (
            <>
              <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1.0625rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.5 }}>
                {profile.identity}
              </p>
              {profile.role && <p style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}>{profile.role}</p>}
              {profile.focus?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {profile.focus.map(f => (
                    <span key={f} style={{ fontSize: '0.6875rem', color: 'var(--accent)', background: 'rgba(92,139,110,0.1)', border: '1px solid rgba(92,139,110,0.2)', borderRadius: 14, padding: '3px 10px' }}>{f}</span>
                  ))}
                </div>
              )}
              <button onClick={() => nav('/onboarding')} style={{ marginTop: 14, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', color: 'var(--ink-3)', padding: 0 }}>
                调整身份 / 重新生成框架 ›
              </button>
            </>
          ) : (
            <button onClick={() => nav('/onboarding')} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: '1rem', fontWeight: 700, color: 'var(--ink)' }}>设置你的身份 ›</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.6 }}>告诉氧气你是谁、关注什么，<br/>它会为你生成专属的知识框架</p>
            </button>
          )}
        </div>

        {/* 数据激励 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, margin: '12px 16px 0' }}>
          <StatCard n={stats?.episodes ?? 0} label="听过" unit="期" />
          <StatCard n={stats?.insights ?? 0} label="沉淀知识点" unit="个" />
          <StatCard n={stats?.reflections ?? 0} label="我的思考" unit="条" />
        </div>

        {/* 听过的列表 */}
        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-2)', padding: '22px 20px 8px' }}>听过的播客</p>
        {episodes.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: '0.8125rem', padding: '20px 0' }}>还没有记录，去「今日」贴第一条链接</p>
        ) : (
          <div style={{ margin: '0 16px', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 10px rgba(43,56,38,0.07)' }}>
            {episodes.map((ep, i) => (
              <div key={ep.id}>
                <Row ep={ep} editing={editing} onClick={() => !editing && nav(`/cards/${ep.id}`)} onDelete={() => handleDelete(ep.id)} />
                {i < episodes.length - 1 && <div style={{ height: '0.5px', background: 'var(--sep)', marginLeft: editing ? 16 : 64 }} />}
              </div>
            ))}
          </div>
        )}
        <div style={{ height: 100 }} />
      </div>

      <BottomNav />
    </div>
  )
}

function StatCard({ n, label, unit }: { n: number; label: string; unit: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '14px 8px', textAlign: 'center', border: '1px solid rgba(92,139,110,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
        <span style={{ fontFamily: "'Special Elite',monospace", fontSize: '1.5rem', color: 'var(--accent)', fontWeight: 700 }}>{n}</span>
        <span style={{ fontSize: '0.625rem', color: 'var(--ink-3)' }}>{unit}</span>
      </div>
      <p style={{ fontSize: '0.625rem', color: 'var(--ink-2)', marginTop: 4 }}>{label}</p>
    </div>
  )
}

function Row({ ep, editing, onClick, onDelete }: { ep: Episode; editing: boolean; onClick: () => void; onDelete: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
      <motion.button initial={false} animate={{ width: editing ? 28 : 0, opacity: editing ? 1 : 0 }} transition={{ duration: 0.22 }}
        onClick={onDelete} style={{ flexShrink: 0, overflow: 'hidden', padding: 0, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 22, height: 22, borderRadius: 11, background: '#E05454', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="10" height="2" viewBox="0 0 10 2" fill="none"><path d="M1 1h8" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
      </motion.button>

      <motion.button whileTap={!editing ? { backgroundColor: 'var(--surface-2)' } : {}} onClick={onClick}
        style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: editing ? 'default' : 'pointer', padding: '13px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 9, flexShrink: 0, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem' }}>🎧</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.6875rem', color: 'var(--accent)', fontWeight: 600, marginBottom: 2 }}>{ep.podcast_name}</p>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.title}</p>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 3, fontSize: '0.6875rem', color: 'var(--ink-3)' }}>
            <span>{fmt(ep.created_at)}</span>
            <span style={{ fontSize: '0.375rem' }}>●</span>
            {ep.status === 'transcribing' || ep.status === 'analyzing'
              ? <span style={{ color: 'var(--accent)', fontWeight: 600 }}>转录中…</span>
              : ep.status === 'error' ? <span style={{ color: 'var(--danger)' }}>处理失败</span>
              : <span>{ep.key_insights.length} 条洞察</span>}
          </div>
        </div>
        {!editing && <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}><path d="M1 1l5 5-5 5" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </motion.button>
    </div>
  )
}
