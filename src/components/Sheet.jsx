import { useEffect, useRef, useState } from 'react'

/** iOS-подобная модальная «шторка» с перетаскиванием и затемнением фона. */
export default function Sheet({ open, onClose, title, subtitle, right, children }) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const [dy, setDy] = useState(0)
  const drag = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      setDy(0)
    } else if (mounted) {
      setClosing(true)
      const t = setTimeout(() => setMounted(false), 280)
      return () => clearTimeout(t)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [mounted, onClose])

  if (!mounted) return null

  const onPointerDown = (e) => {
    if (e.target.closest('button, input, a, .no-drag')) return
    drag.current = { y: e.clientY, scroll: panelRef.current?.querySelector('.sheet-body')?.scrollTop ?? 0 }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!drag.current) return
    const delta = e.clientY - drag.current.y
    if (delta > 0) setDy(delta)
  }
  const onPointerUp = () => {
    if (!drag.current) return
    drag.current = null
    if (dy > 110) onClose()
    else setDy(0)
  }

  return (
    <div className={`sheet-layer ${closing ? 'is-closing' : ''}`}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div
        ref={panelRef}
        className="sheet"
        style={dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="sheet-grabber-area"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="sheet-grabber" />
          <header className="sheet-head">
            <div className="sheet-head-text">
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <div className="sheet-head-right">
              {right}
              <button className="icon-btn close" onClick={onClose} aria-label="Закрыть">
                <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
                  <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
                </svg>
              </button>
            </div>
          </header>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
