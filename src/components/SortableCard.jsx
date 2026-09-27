import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import PlayingCard from "./PlayingCard"

function SortableCard({
  card,
  index,
  selected,
  isNew,
  onSelect
}) {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: card
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    zIndex: isDragging
      ? 20
      : selected
        ? 10
        : 1
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={
        "card my-card " +
        (selected ? "selected-card " : "") +
        (isDragging ? "dragging-card " : "") +
        (isNew ? "new-card " : "") +
        (index === 0 ? "first-card" : "")
      }
      onClick={() => onSelect(card)}
    >
      {isNew && (
        <span className="new-badge">
          NEW
        </span>
      )}
      <PlayingCard card={card} />
    </button>
  )
}

export default SortableCard
