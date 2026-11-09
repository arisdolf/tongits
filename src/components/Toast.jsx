import "../styles/Toast.css"

function Toast({ toast, onClose, onClick }) {

  if (!toast) return null

  const actionable = toast.action === "open-chat"
  const activate = () => (onClick || onClose)?.()

  return (
    <div
      className={"toast toast-" + toast.type}
      role={actionable ? "button" : "status"}
      tabIndex={actionable ? 0 : undefined}
      onClick={activate}
      onKeyDown={e => {
        if (actionable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          activate()
        }
      }}
    >
      <span>{toast.text}</span>
      {actionable && <span className="toast-action-hint">Tap to open chat</span>}
    </div>
  )
}

export default Toast
