import { useLayoutEffect, useRef, useState } from 'react'

/** Сегментированный контрол в стиле iOS с «переезжающей» подложкой. */
export default function Segmented({ options, value, onChange, size = 'md' }) {
  const wrapRef = useRef(null)
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false })

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const idx = options.findIndex((o) => o.value === value)
    const el = wrap.children[idx + 1] // +1 — подложка
    if (!el) return
    setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true })
  }, [value, options])

  return (
    <div className={`segmented size-${size}`} ref={wrapRef} role="tablist">
      <span
        className="segmented-pill"
        style={{
          transform: `translateX(${pill.left}px)`,
          width: pill.width,
          opacity: pill.ready ? 1 : 0,
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={`segmented-item ${o.value === value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
