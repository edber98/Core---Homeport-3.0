const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

class LocalAdapter {
  constructor(basePath) {
    this.basePath = path.resolve(basePath);
  }

  _fullPath(relativePath) {
    const full = path.resolve(this.basePath, relativePath);
    if (!full.startsWith(this.basePath)) throw new Error('Invalid path');
    return full;
  }

  async write(relativePath, readableStream) {
    const full = this._fullPath(relativePath);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    const ws = fs.createWriteStream(full);
    await pipeline(readableStream, ws);
    const stat = await fs.promises.stat(full);
    return { bytesWritten: stat.size };
  }

  read(relativePath) {
    const full = this._fullPath(relativePath);
    return fs.createReadStream(full);
  }

  async delete(relativePath) {
    const full = this._fullPath(relativePath);
    try { await fs.promises.unlink(full); } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }

  async exists(relativePath) {
    const full = this._fullPath(relativePath);
    try { await fs.promises.access(full); return true; } catch { return false; }
  }
}

module.exports = LocalAdapter;
