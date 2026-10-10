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
   {id: "sticker10",  type: "image", content: "emotes/sticker10.jpg" },
  { id: "sticker11",  type: "image", content: "emotes/sticker11.webp" },
  { id: "sticker12",  type: "image", content: "emotes/sticker12.jpg" },
  { id: "sticker13",  type: "image", content: "emotes/sticker13.jpg" },
  { id: "sticker14",  type: "image", content: "emotes/sticker14.jpg" },
  { id: "sticker15",  type: "image", content: "emotes/sticker15.jpg" },
  { id: "sticker16",  type: "image", content: "emotes/sticker16.jpg" },
  { id: "sticker17",  type: "image", content: "emotes/sticker17.webp" },
  { id: "sticker18",  type: "image", content: "emotes/sticker18.webp" },
  { id: "sticker19",  type: "image", content: "emotes/sticker19.webp" },
  { id: "sticker20",  type: "image", content: "emotes/sticker20.webp" },
  { id: "sticker21",  type: "image", content: "emotes/sticker21.webp" },
  { id: "sticker22",  type: "image", content: "emotes/sticker22.webp" },
  { id: "sticker23",  type: "image", content: "emotes/sticker23.webp" },
  { id: "sticker24",  type: "image", content: "emotes/sticker24.webp" },
   {id: "sticker25",  type: "image", content: "emotes/sticker25.webp" },
  { id: "sticker26",  type: "image", content: "emotes/sticker26.webp" },
  { id: "sticker27",  type: "image", content: "emotes/sticker27.jpg" },
  { id: "sticker28",  type: "image", content: "emotes/sticker28.webp" },
  { id: "sticker29",  type: "image", content: "emotes/sticker29.webp" },
  { id: "sticker30",  type: "image", content: "emotes/sticker30.webp" }
]

export const getEmote = id => EMOTES.find(e => e.id === id) || null