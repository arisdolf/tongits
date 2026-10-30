import { createDeck, getCardImagePaths, rememberCardPath } from "./cardUtils"

function loadCard(card) {
  const paths = getCardImagePaths(card)
  return new Promise(resolve => {
    let i = 0
    const tryNext = () => {
      if (i >= paths.length) return resolve()
      const img = new Image()
      img.onload = () => { rememberCardPath(card, paths[i]); resolve() }
      img.onerror = () => { i++; tryNext() }
      img.src = import.meta.env.BASE_URL + paths[i]
    }
    tryNext()
  })
}

let promise = null

export function preloadCards() {
  if (!promise) {
    const back = new Promise(resolve => {
      const img = new Image()
      img.onload = img.onerror = resolve
      img.src = import.meta.env.BASE_URL + "cards/backcards/back.png"
    })
    promise = Promise.all([back, ...createDeck().map(loadCard)])
  }
  return promise
}