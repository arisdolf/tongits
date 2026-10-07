export const EMOTES = [
  { id: "gg",    type: "text",  content: "GG" },
  { id: "laugh", type: "emoji", content: "😂" },
  { id: "cry",   type: "emoji", content: "😭" },
  { id: "fire",  type: "emoji", content: "🔥" },
  { id: "think", type: "emoji", content: "🤔" },
  { id: "salute",type: "emoji", content: "🫡" }
  // custom image: put the file in public/emotes/ then:
  // { id: "pogi", type: "image", content: "emotes/pogi.png" },
]

export const getEmote = id => EMOTES.find(e => e.id === id) || null