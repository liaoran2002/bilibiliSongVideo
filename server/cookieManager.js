import puppeteer from 'puppeteer-core'
import { execSync } from 'child_process'

let cachedCookie = null
let cookieExpireAt = 0

function findBrowserPath() {
  const paths = [
    // Edge
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
    // Chrome
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  ]
  for (const p of paths) {
    try { execSync(`"${p}" --version`, { stdio: 'ignore' }); return p } catch {}
  }
  throw new Error('未找到Chrome或Edge浏览器')
}

export async function getBiliCookie() {
  if (cachedCookie && Date.now() < cookieExpireAt) return cachedCookie

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: findBrowserPath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.goto('https://www.bilibili.com', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 3000))

    const cookies = await page.cookies()
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    console.log('✅ Cookie获取成功')

    cachedCookie = cookieStr
    cookieExpireAt = Date.now() + 30 * 60 * 1000
    return cookieStr
  } finally {
    await browser.close()
  }
}

export function clearCookieCache() {
  cachedCookie = null
  cookieExpireAt = 0
}
