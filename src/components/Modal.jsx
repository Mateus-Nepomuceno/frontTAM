import { useEffect } from 'react'

export function Modal({ title, onClose, children, footer, maxWidth, accentColor, headColor, headText }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const style = {
    ...(maxWidth ? { maxWidth } : {}),
    ...(accentColor ? { borderTop: `6px solid ${accentColor}` } : {}),
  }

  const headStyle = headColor
    ? { background: headColor, color: headText || '#fff', borderBottomColor: 'transparent' }
    : undefined

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={Object.keys(style).length ? style : undefined} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head" style={headStyle}>
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar" style={{ color: '#000' }}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ title = 'Confirmar ação', message, confirmLabel = 'Confirmar', onConfirm, onCancel }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel?.()}>
      <div className="modal confirm" role="alertdialog" aria-modal="true" aria-label={title}>
        <div className="modal-body" style={{ textAlign: 'center' }}>
          <div className="confirm-icon" style={{ margin: '0 auto 1rem' }} aria-hidden="true">!</div>
          <h3 style={{ marginBottom: '0.5rem' }}>{title}</h3>
          <p className="muted" style={{ marginBottom: '0.5rem' }}>{message}</p>
        </div>
        <div className="modal-foot" style={{ justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
