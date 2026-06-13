import http from './httpRequest'

export function searchSong(keyword) {
  return http.post('/biliapi/search_song', { keyword })
}

export function resolveVideo(bvid) {
  return http.post('/biliapi/resolve_video', { bvid })
}
