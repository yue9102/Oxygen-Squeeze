import React from 'react'

interface NavBarProps {
  title: string
  subtitle?: string
  rightAction?: React.ReactNode
  /** extra content below the title (e.g. filter chips) */
  children?: React.ReactNode
}

/**
 * Large-title navigation bar, consistent across all light-mode pages.
 * - Title: Noto Serif SC, 2rem 900 — matches Home "今天听了什么呀"
 * - Frosted-glass background, 0.5px bottom separator
 * - Status-bar spacer (54px) built in
 */
export default function NavBar({ title, subtitle, rightAction, children }: NavBarProps) {
  return (
    <div style={{
      flexShrink: 0,
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      {/* Status bar area */}
      <div style={{ height: 54 }} />

      {/* Title row */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: '2rem', fontWeight: 900,
            color: 'var(--ink)', lineHeight: 1.2,
            letterSpacing: '-0.01em',
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: 3 }}>
              {subtitle}
            </p>
          )}
        </div>
        {rightAction && (
          <div style={{ paddingBottom: 4 }}>{rightAction}</div>
        )}
      </div>

      {/* Optional children (e.g. filter chips) — no side padding, let child manage overflow */}
      {children && (
        <div style={{ marginTop: 10, overflow: 'hidden' }}>{children}</div>
      )}

      {/* Bottom separator */}
      <div style={{ height: '0.5px', background: 'var(--sep)', marginTop: 12 }} />
    </div>
  )
}
