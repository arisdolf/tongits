/*
 * YOUTUBE HELPERS
 * - search needs VITE_YT_API_KEY in .env (YouTube Data API v3)
 * - pasting a link needs no key
 */
const KEY = import.meta.env.VITE_YT_API_KEY?.trim()

export const thumbUrl = videoId => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`

// youtube.com/watch?v=ID, youtu.be/ID, /shorts/ID, /embed/ID, music.youtube.com...
export function parseVideoId(text) {
  const m = text
    .trim()
    .match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|music\.youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/)
  return m ? m[1] : null
}

// search results come back HTML-escaped ("Tom &amp; Jerry")
function decode(s) {
  const t = document.createElement("textarea")
  t.innerHTML = s
  return t.value
}

export async function searchVideos(q) {
  if (!KEY) throw new Error("YouTube search needs VITE_YT_API_KEY in this site's build settings.")

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    maxResults: "8",
    q,
    key: KEY
  })

  const res = await fetch("https://www.googleapis.com/youtube/v3/search?" + params)
  const data = await res.json()
  if (!res.ok) {
    const reason = data.error?.errors?.[0]?.reason
    const message = reason === "quotaExceeded" || reason === "dailyLimitExceeded"
      ? "YouTube search limit reached. Try again tomorrow."
      : reason === "keyInvalid"
        ? "YouTube search key is invalid. Check VITE_YT_API_KEY."
        : reason === "accessNotConfigured"
          ? "Enable YouTube Data API v3 for the Google Cloud project."
          : reason === "ipRefererBlocked"
            ? "This site is blocked by the YouTube API key's website restrictions."
            : data.error?.message || "YouTube search failed. Check the API key and try again."
    throw new Error(message)
  }

  return (data.items || []).map(item => ({
    videoId: item.id.videoId,
    title: decode(item.snippet.title),
    channel: decode(item.snippet.channelTitle)
  }))
}

// title for a pasted link (no API key needed)
export async function fetchTitle(videoId) {
  try {
    const url = "https://noembed.com/embed?url=" +
      encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)
    const res = await fetch(url)
    const data = await res.json()
    return data.title || "YouTube video"
  } catch {
    return "YouTube video"
  }
}
