import { useDroppable } from "@dnd-kit/core"

/*
 * DISCARD DROP ZONE
 * A droppable target so a hand card can be
 * dragged straight onto the discard pile.
 */

function DiscardDropZone({ children }) {

  const { setNodeRef, isOver } = useDroppable({
    id: "discard-zone"
  })

  return (
    <div
      ref={setNodeRef}
      className={"discard " + (isOver ? "discard-drop-over" : "")}
    >
      {children}
    </div>
  )
}

export default DiscardDropZone
