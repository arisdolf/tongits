import { playCardSound } from "./sounds"
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
    playCardSound(delay)
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

function makeGhost(source) {
  const face = source.querySelector(".card-face") || source
  const rect = face.getBoundingClientRect()
  const el = document.createElement("div")
  el.innerHTML = source.innerHTML
  el.querySelectorAll("*").forEach(n => { n.style.animation = "none" })
  el.querySelectorAll(".new-badge, .deck-count").forEach(n => n.remove())

  Object.assign(el.style, {
    position: "fixed",
    left: rect.left + "px",
    top: rect.top + "px",
    width: rect.width + "px",
    height: rect.height + "px",
    borderRadius: "0",
    zIndex: "1500",
    pointerEvents: "none",
    willChange: "transform"
  })
  document.body.appendChild(el)

  return {
    el, rect,
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2
  }
}

/*
 * Balatro-style meld:
 * 1. cards jump out of the hand and fan out in the middle
 * 2. they wiggle (display as a meld)
 * 3. they collapse into one stack
 * 4. the stack flies to the meld area
 * 5. the cards spread into their slots in the meld
 */
export async function flyMeld({ sources, slots = [], getTarget, getFallback }) {
  const items = sources
    .map((s, i) => (s ? { ...makeGhost(s), slot: slots[i] } : null))
    .filter(Boolean)
  if (!items.length) return

  const n = items.length
  let target = null
  let prevVisibility = ""
  const started = performance.now()

  // hide the real meld as soon as it appears, so cards don't show twice
  const findTarget = () => {
    if (target) return
    const el = getTarget()
    if (el) {
      target = el
      prevVisibility = el.style.visibility
      el.style.visibility = "hidden"
    } else if (performance.now() - started < 1200) {
      requestAnimationFrame(findTarget)
    }
  }
  findTarget()

  const body = document.querySelector(".table-body")?.getBoundingClientRect()
  const stage = body
    ? { x: body.left + body.width / 2, y: body.top + body.height / 2 }
    : { x: innerWidth / 2, y: innerHeight / 2 }
  const gap = Math.min(44, ((body?.width ?? innerWidth) * 0.8) / n)

  const T = (x, y, s, r) => `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`
  const move = (it, frames, opts) => it.el.animate(frames, { fill: "both", ...opts }).finished
  const SNAP = "cubic-bezier(0.22,1,0.36,1)"

  try {
   
    // 1. JUMP OUT: in the Promise.all(items.map((it, i) => ...)) for the fan-out

    items.forEach((it, i) => {
      const off = i - (n - 1) / 2
      it.dx = stage.x + off * gap - it.cx
      it.dy = stage.y - it.cy
      it.rot = off * 7
      it.pose = T(it.dx, it.dy, 1.2, it.rot)
      it.stack = T(stage.x - it.cx, stage.y - it.cy, 1.1, ((i % 3) - 1) * 3)
      
    })

    await Promise.all(items.map((it, i) => {
  playCardSound(i * 50)
  return move(it, [
    { transform: T(0, 0, 1, 0) },
    { transform: T(it.dx * 0.5, it.dy * 0.5 - 70, 1.3, it.rot * 0.4), offset: 0.45 },
    { transform: it.pose }
  ], { duration: 420, delay: i * 50, easing: SNAP })
}))

    // 2. WIGGLE (shown as a meld)
    await Promise.all(items.map((it, i) =>
      move(it, [
        { transform: it.pose },
        { transform: T(it.dx, it.dy - 8, 1.24, it.rot + 2.5) },
        { transform: it.pose }
      ], { duration: 450, delay: i * 30, easing: "ease-in-out" })
    ))

  
    // 3. COLLAPSE: add one line before the collapse Promise.all
    playCardSound()
    await Promise.all(items.map(it =>
      move(it, [{ transform: it.pose }, { transform: it.stack }],
        { duration: 260, easing: "cubic-bezier(0.5,0,0.75,0)" })
    ))

    // 4. STACK FLIES TO THE MELD
    findTarget()
    const landing = target || getFallback?.()
    if (!landing) return

    const lr = landing.getBoundingClientRect()
    const lx = lr.left + lr.width / 2
    const ly = lr.top + lr.height / 2
    const slotEls = target ? [...target.querySelectorAll(".meld-card")] : []
    const useSlots = slotEls.length === n
    const cardScale = useSlots
      ? slotEls[0].getBoundingClientRect().height / items[0].rect.height
      : 0.5

    items.forEach(it => { it.land = T(lx - it.cx, ly - it.cy, cardScale * 1.15, 0) })

    await Promise.all(items.map(it =>
      move(it, [{ transform: it.stack }, { transform: it.land }],
        { duration: 340, easing: SNAP })
    ))

    // 5. SPREAD INTO THE MELD SLOTS
    await Promise.all(items.map((it, i) => {
  playCardSound(i * 35)
  const slot = useSlots ? slotEls[it.slot] : null
      if (slot) {
        const r = slot.getBoundingClientRect()
        const end = T(
          r.left + r.width / 2 - it.cx,
          r.top + r.height / 2 - it.cy,
          r.height / it.rect.height,
          0
        )
        return move(it, [{ transform: it.land }, { transform: end }],
          { duration: 280, delay: i * 35, easing: SNAP })
      }
      // merged into another meld, so just shrink away
      return move(it, [
        { transform: it.land, opacity: 1 },
        { transform: T(lx - it.cx, ly - it.cy, cardScale * 0.6, 0), opacity: 0 }
      ], { duration: 250, easing: "ease-in" })
    }))
  } catch {
    // animation cancelled, nothing to do
  } finally {
    items.forEach(it => it.el.remove())
    if (target) target.style.visibility = prevVisibility
  }
}