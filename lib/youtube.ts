/** Identyfikator filmu z linku YouTube (watch?v=, youtu.be/, embed/). */
export function youtubeId(url: string) {
  return url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/)?.[1]
}
