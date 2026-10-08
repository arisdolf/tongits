export function flyCard({
  source,            // element whose contents get cloned
  fromRect,          // optional: start rect (e.g. drag position)
  getTarget,         // () => element to fly to (retried for ~600ms)
  delay = 0,
  duration = 400,
  hideTarget = false // hide the real card until the ghost lands
}) {
  if (!source) return

  const from = fromRect || source.getBoundingClientRect()
  const ghost = document.createElement("div")
  ghost.innerHTML = source.innerHTML
  ghost.querySelectorAll("*").forEach(n => { n.style.animation = "none" })
  ghost.querySelectorAll(".new-badge").forEach(n => n.remove())
  ghost.querySelectorAll(".new-badge, .deck-count").forEach(n => n.remove())

  Object.assign(ghost.style, {
    position: "fixed",
    left: from.left + "px",
    top: from.top + "px",
    width: from.width + "px",
    height: from.height + "px",
    borderRadius: "0",
    overflow: "hidden",
    zIndex: "1500",
    pointerEvents: "none"
  })
  document.body.appendChild(ghost)

  const started = performance.now()

  function launch() {
    const target = getTarget()

    if (!target) {
      if (performance.now() - started < 600) requestAnimationFrame(launch)
      else ghost.remove()
      return
    }

    const to = target.getBoundingClientRect()
    const prevVisibility = target.style.visibility
    if (hideTarget) target.style.visibility = "hidden"

    const dx = to.left + to.width / 2 - (from.left + from.width / 2)
    const dy = to.top + to.height / 2 - (from.top + from.height / 2)
    const scale = Math.max(0.4, Math.min(1.2, to.height / from.height))

    const anim = ghost.animate(
      [
        { transform: "translate(0,0) scale(1) rotate(0deg)" },
        { transform: `translate(${dx}px,${dy}px) scale(${scale}) rotate(6deg)` }
      ],
      { duration, delay, easing: "cubic-bezier(0.22,1,0.36,1)", fill: "both" }
    )

    const done = () => {
      ghost.remove()
      if (hideTarget) target.style.visibility = prevVisibility
    }
    anim.onfinish = done
    anim.oncancel = done
  }

  launch()
}