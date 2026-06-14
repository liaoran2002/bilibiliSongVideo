import http from './httpRequest'

export function searchSong(keyword) {
  return http.post('/search_song', { keyword })
}

export function resolveVideo(bvid) {
  return http.post('/resolve_video', { bvid })
}
