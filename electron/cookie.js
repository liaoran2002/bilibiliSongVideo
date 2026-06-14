const { session } = require('electron');

async function getCookieString() {
  try {
    const cookies = await session.defaultSession.cookies.get({});
    if (cookies.length === 0) return null;
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  } catch {
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

module.exports = {
  getCookieString,
  hasValidCookies,
};
