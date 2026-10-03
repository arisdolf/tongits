import "../styles/Toast.css"

function Toast({ toast, onClose }) {

  if (!toast) return null

  return (
    <div
      className={"toast toast-" + toast.type}
      role="status"
      onClick={onClose}
    >
      {toast.text}
    </div>
  )
}

export default Toast