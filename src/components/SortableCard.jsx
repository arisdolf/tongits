import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import PlayingCard from "./PlayingCard"

function SortableCard({
  id, card, index, selected, isNew, onSelect,
  groupIndex = -1,
  groupStart = false

}) {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: id
  })

  // The button ONLY carries dnd-kit's transform.
  // Lift / hover / glow live on the inner .card-face.
  const style = {

    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    zIndex: isDragging ? 20 : index + 1
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-card={card}
      className={
        "card my-card " +
        (selected ? "selected-card " : "") +
        (isDragging ? "dragging-card " : "") +
        (isNew ? "new-card " : "") +
        (groupIndex >= 0 ? "grouped-card group-" + (groupIndex % 4) + " " : "") +
        (groupStart ? "group-start " : "") +
        (index === 0 ? "first-card" : "")
      }
      onClick={() => onSelect(card)}
    >
      <div className="card-face">
        {isNew && <span className="new-badge">NEW</span>}
        <PlayingCard card={card} />
      </div>
    </button>
  )
}

export default SortableCard