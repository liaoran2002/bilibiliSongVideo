const { app, session } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-cbc';
const KEY_SALT = 'bilibiliSongVideo';
const KEY_STATIC = 'desktop-app-encryption';

let _key = null;

function getKey() {
  if (!_key) {
    const userData = app.getPath('userData');
    _key = crypto.scryptSync(userData + KEY_SALT, KEY_STATIC, 32);
  }
  return _key;
}

function encrypt(text) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(data) {
  const key = getKey();
  const parts = data.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts.slice(1).join(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function getCookieFilePath() {
  return path.join(app.getPath('userData'), 'cookies.enc');
}

async function saveCookies(cookies) {
  try {
    const cookieData = JSON.stringify(cookies);
    const encrypted = encrypt(cookieData);
    fs.writeFileSync(getCookieFilePath(), encrypted, 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save cookies:', err);
    return false;
  }
}

async function loadCookies() {
  try {
    const filePath = getCookieFilePath();
    if (!fs.existsSync(filePath)) return false;

    const encrypted = fs.readFileSync(filePath, 'utf-8');
    const cookieData = decrypt(encrypted);
    const cookies = JSON.parse(cookieData);

    for (const cookie of cookies) {
      const url = `http${cookie.secure ? 's' : ''}://${cookie.domain.replace(/^\./, '')}${cookie.path}`;
      await session.defaultSession.cookies.set({
        url,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        expirationDate: cookie.expirationDate,
      });
    }
    return true;
  } catch (err) {
    console.error('Failed to load cookies:', err);
    return false;
  }
}

async function getCookieString() {
  try {
    const cookies = await session.defaultSession.cookies.get({});
    if (cookies.length === 0) return null;
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  } catch (err) {
    console.error('Failed to get cookies:', err);
    return null;
  }
}

async function hasValidCookies() {
  try {
    const cookies = await session.defaultSession.cookies.get({});
    return cookies.length > 0;
  } catch {
    return false;
  }
}

async function clearCookies() {
  try {
    await session.defaultSession.clearStorageData({ storages: 'cookies' });
    const filePath = getCookieFilePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (err) {
    console.error('Failed to clear cookies:', err);
    return false;
  }
}

module.exports = {
  saveCookies,
  loadCookies,
  getCookieString,
  hasValidCookies,
  clearCookies,
};
