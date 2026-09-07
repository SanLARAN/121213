/** Строки списков в стиле «Настроек» iOS. */

export function Group({ title, footer, children }) {
  return (
    <section className="list-group">
      {title && <h3 className="list-title">{title}</h3>}
      <div className="list">{children}</div>
      {footer && <p className="list-footer">{footer}</p>}
    </section>
  )
}

export function Row({ icon, iconColor, label, sub, value, onClick, children, chevron }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`row ${onClick ? 'is-tappable' : ''}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      {icon && (
        <span className="row-icon" style={{ background: iconColor || 'var(--accent)' }}>
          {icon}
        </span>
      )}
      <span className="row-main">
        <span className="row-label">{label}</span>
        {sub && <span className="row-sub">{sub}</span>}
      </span>
      <span className="row-trailing">
        {value && <span className="row-value">{value}</span>}
        {children}
        {chevron && (
          <svg className="chevron" viewBox="0 0 12 20" width="8" height="13" aria-hidden="true">
            <path d="M2 2l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </Tag>
  )
}

export function Switch({ checked, onChange, label }) {
  return (
    <label className="switch no-drag" aria-label={label}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track"><span className="switch-knob" /></span>
    </label>
  )
}
