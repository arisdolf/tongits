import { useRef, useEffect } from "react"
import { useDroppable } from "@dnd-kit/core"

/*
 * DISCARD DROP ZONE
 * - drop a hand card on it to discard
 * - tap it to take the card (when it flashes)
 * - hold it to view every discarded card
 */

const HOLD_MS = 500

function DiscardDropZone({ children, canTake, onTap, onHold }) {

  const { setNodeRef, isOver } = useDroppable({
    id: "discard-zone"
  })

  const timerRef = useRef(null)
  const heldRef = useRef(false)

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  function startHold() {
    heldRef.current = false
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      heldRef.current = true
      onHold()
    }, HOLD_MS)
  }

  function cancelHold() {
    clearTimeout(timerRef.current)
  }

  function handleClick() {
    if (heldRef.current) {
      heldRef.current = false
      return
    }
    onTap()
  }

  return (
    <div
      ref={setNodeRef}
      className={
        "discard " +
        (isOver ? "discard-drop-over " : "") +
        (canTake ? "discard-can-take" : "")
      }
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onClick={handleClick}
      onContextMenu={e => e.preventDefault()}
    >
      {children}
    </div>
  )
}

export default DiscardDropZone