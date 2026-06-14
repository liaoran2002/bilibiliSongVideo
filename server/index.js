import fs from 'fs'
import path from 'path'
import express from 'express'
import cors from 'cors'
import {
  searchSong,
  searchSome,
  resolveVideoUrl,
  fetchSongList,
  getUserInfo,
} from './biliApi.js'
import { clearCookieCache } from './cookieManager.js'

const SONG_DIR = path.join(process.cwd(), 'song')
if (!fs.existsSync(SONG_DIR)) fs.mkdirSync(SONG_DIR, { recursive: true })

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

function sanitizeFilename(str) {
  return str.replace(/[\\/:*?"<>|]/g, '')
}

app.post('/search_song', async (req, res) => {
  try {
    const keyword = req.body?.keyword || ''
    console.log(`收到搜索关键词: ${keyword}`)
    if (!keyword) {
      return res.status(400).json({ code: 400, message: '关键词不能为空' })
    }

    const filename = sanitizeFilename(`${keyword}.json`)
    const filePath = path.join(SONG_DIR, filename)
    if (fs.existsSync(filePath)) {
      try {
        const cached = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        return res.json(cached)
      } catch (e) {
        console.log(`读取缓存错误: ${e.message}`)
      }
    }

    const result = await searchSong(keyword)
    if (result.code !== 0) {
      console.log(`获取数据失败: ${keyword}`)
      return res.json(result)
    }

    fs.writeFileSync(filePath, JSON.stringify(result, null, 4), 'utf-8')
    console.log(`数据已保存到 ${filePath}`)
    return res.json(result)
  } catch (e) {
    console.error(e)
    return res.status(400).json({ code: 400, message: '关键词搜索出错，请重试' })
  }
})

app.post('/search_some', async (req, res) => {
  try {
    const { keyword, order } = req.body || {}
    if (!keyword) {
      return res.status(400).json({ code: 400, message: '关键词不能为空' })
    }
    const result = await searchSome(keyword, order)
    return res.json(result)
  } catch (e) {
    return res.status(400).json({ code: 400, message: '关键词搜索出错，请重试' })
  }
})

app.post('/resolve_video', async (req, res) => {
  try {
    const bvid = req.body?.bvid || ''
    if (!bvid) {
      return res.status(400).json({ code: 400, message: 'bvid不能为空' })
    }
    const videoUrl = await resolveVideoUrl(bvid)
    return res.json({ code: 0, videoUrl })
  } catch (e) {
    return res.status(400).json({ code: 400, message: e.message })
  }
})

app.post('/fetch_song_list', async (req, res) => {
  try {
    const songListUrl = req.body?.url || ''
    if (!songListUrl) {
      return res.status(400).json({ code: 400, message: 'url不能为空' })
    }
    const result = await fetchSongList(songListUrl)
    return res.json({ code: 0, data: result })
  } catch (e) {
    return res.status(400).json({ code: 400, message: e.message })
  }
})

app.post('/get_user_info', async (_req, res) => {
  try {
    const info = await getUserInfo()
    return res.json({ code: 0, data: info })
  } catch (e) {
    return res.status(400).json({ code: 400, message: e.message })
  }
})

app.post('/refresh_cookie', (_req, res) => {
  clearCookieCache()
  return res.json({ code: 0, message: 'Cookie缓存已清除' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`✅ Express后端启动: http://localhost:${PORT}`)
})
