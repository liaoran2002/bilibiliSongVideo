const koffi = require('koffi');

const user32 = koffi.load('user32.dll');
const FindWindowA = user32.func('FindWindowA', 'void*', ['str', 'str']);
const GetParent = user32.func('GetParent', 'void*', ['void*']);
const SendMessageTimeoutA = user32.func('SendMessageTimeoutA', 'int64', ['void*', 'uint32', 'uint64', 'int64', 'uint32', 'uint32', 'void*']);

const SMTO_ABORTIFHUNG = 0x0002;

function isInWorkerWLayer(hwnd) {
  const progman = FindWindowA('Progman', null);
  if (!progman) return false;

  const resultBuf = koffi.alloc('int64', 1);
  const sendRet = SendMessageTimeoutA(
    progman,
    0x0400 + 0x052C,
    0, 0,
    SMTO_ABORTIFHUNG,
    1000,
    resultBuf
  );
  if (sendRet === 0) return false;

  const workerW = koffi.decode(resultBuf, 'int64');
  if (workerW === 0) return false;

  let current = hwnd;
  for (let i = 0; i < 50; i++) {
    if (!current) return false;
    if (current === workerW) return true;
    current = GetParent(current);
  }
  return false;
}

module.exports = { isInWorkerWLayer };
