export const EMOTES = [
 
  // custom image: put the file in public/emotes/ then:
  { id: "sticker1",  type: "image", content: "emotes/sticker1.webp" },
  { id: "sticker2",  type: "image", content: "emotes/sticker2.webp" },
  { id: "sticker3",  type: "image", content: "emotes/sticker3.webp" },
  { id: "sticker4",  type: "image", content: "emotes/sticker4.webp" },
  { id: "sticker5",  type: "image", content: "emotes/sticker5.webp" },
  { id: "sticker6",  type: "image", content: "emotes/sticker6.webp" },
  { id: "sticker7",  type: "image", content: "emotes/sticker7.webp" },
  { id: "sticker8",  type: "image", content: "emotes/sticker8.webp" },
  { id: "sticker9",  type: "image", content: "emotes/sticker9.webp" },
   {id: "sticker10",  type: "image", content: "emotes/sticker6.jpg" },
  { id: "sticker11",  type: "image", content: "emotes/sticker7.jpg" },
  { id: "sticker12",  type: "image", content: "emotes/sticker8.jpg" },
  { id: "sticker13",  type: "image", content: "emotes/sticker9.jpg" },
  { id: "sticker14",  type: "image", content: "emotes/sticker8.jpg" },
  { id: "sticker15",  type: "image", content: "emotes/sticker9.jpg" }
]

export const getEmote = id => EMOTES.find(e => e.id === id) || null