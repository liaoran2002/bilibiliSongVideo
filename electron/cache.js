const { app } = require('electron');
const fs = require('fs');
const path = require('path');

function getCacheDir() {
  const dir = path.join(app.getPath('userData'), 'search-cache');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function sanitizeFilename(keyword) {
  return keyword.replace(/[\\/:*?"<>|]/g, '');
}

function getCachePath(keyword) {
  return path.join(getCacheDir(), `${sanitizeFilename(keyword)}.json`);
}

async function get(keyword) {
  try {
    const filePath = getCachePath(keyword);
    if (!fs.existsSync(filePath)) return null;

    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Cache read error:', err);
    return null;
  }
}

async function save(keyword, data) {
  try {
    const filePath = getCachePath(keyword);
    const cacheData = {
      timestamp: Date.now(),
      data,
    };
    fs.writeFileSync(filePath, JSON.stringify(cacheData, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Cache write error:', err);
    return false;
  }
}

async function clearAll() {
  try {
    const dir = getCacheDir();
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(dir, file));
      }
    }
    return true;
  } catch (err) {
    console.error('Cache clear error:', err);
    return false;
  }
}

async function clearSingle(keyword) {
  try {
    const filePath = getCachePath(keyword);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (err) {
    console.error('Cache clear error:', err);
    return false;
  }
}

module.exports = { get, save, clearAll, clearSingle };
