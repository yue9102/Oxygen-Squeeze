import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Home    from './pages/Home'
import Cards   from './pages/Cards'
import Shelf   from './pages/Shelf'
import History from './pages/History'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* SVG grain filter for knowledge card paper texture */}
    <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden>
      <defs>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.58 0.66" numOctaves="6" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
      </defs>
    </svg>

    <div id="phone-shell">
      {/* Dynamic Island */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        width: 120, height: 34, borderRadius: 17,
        background: '#000', zIndex: 100, pointerEvents: 'none',
      }} />

      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <BrowserRouter>
          <Routes>
            <Route path="/"          element={<Home />} />
            <Route path="/cards/:id" element={<Cards />} />
            <Route path="/shelf"     element={<Shelf />} />
            <Route path="/history"   element={<History />} />
            <Route path="*"          element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </div>

      {/* Home indicator */}
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        width: 130, height: 5, borderRadius: 3,
        background: 'rgba(43,56,38,0.2)', zIndex: 100, pointerEvents: 'none',
      }} />
    </div>
  </StrictMode>
)
