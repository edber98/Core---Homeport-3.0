const { randomUUID } = require('crypto');
const { createHash } = require('crypto');
const path = require('path');
const { Readable } = require('stream');
const FileRecord = require('../db/models/file.model');
const LocalAdapter = require('./file-storage-local');
const S3Adapter = require('./file-storage-s3');
const env = require('../config/env');

let _adapter = null;

function getAdapter() {
  if (_adapter) return _adapter;
  if (env.FILE_STORAGE_TYPE === 's3') {
    _adapter = new S3Adapter({
      bucket: env.FILE_S3_BUCKET,
      region: env.FILE_S3_REGION,
      accessKey: env.FILE_S3_ACCESS_KEY,
      secretKey: env.FILE_S3_SECRET_KEY,
      endpoint: env.FILE_S3_ENDPOINT,
    });
  } else {
    _adapter = new LocalAdapter(env.FILE_STORAGE_PATH);
  }
  return _adapter;
}

function parseDuration(str) {
  if (!str) return 0;
  const m = String(str).match(/^(\d+)\s*(ms|s|m|h|d)$/i);
  if (!m) return parseInt(str, 10) || 0;
  const n = parseInt(m[1], 10);
  switch (m[2].toLowerCase()) {
    case 'ms': return n;
    case 's':  return n * 1000;
    case 'm':  return n * 60 * 1000;
    case 'h':  return n * 3600 * 1000;
    case 'd':  return n * 86400 * 1000;
    default:   return n;
  }
}

function parseMaxSize(str) {
  if (!str) return Infinity;
  const m = String(str).match(/^(\d+)\s*(b|kb|mb|gb)$/i);
  if (!m) return parseInt(str, 10) || Infinity;
  const n = parseInt(m[1], 10);
  switch (m[2].toLowerCase()) {
    case 'b':  return n;
    case 'kb': return n * 1024;
    case 'mb': return n * 1024 * 1024;
    case 'gb': return n * 1024 * 1024 * 1024;
    default:   return n;
  }
}

function makeRelativePath(workspaceId, originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  return `${workspaceId}/${randomUUID()}${ext}`;
}

function buildFileRef(record) {
  return {
    _type: 'fileRef',
    fileId: record.id,
    name: record.name,
    mimeType: record.mimeType,
    size: record.size,
  };
}

function bufferToStream(buffer) {
  return Readable.from(buffer);
}

/**
 * Create a scoped file helper for use in handlers (opts.files).
 * The context binds workspaceId, companyId, and optionally runId.
 */
function createFilesHelper(context) {
  const { workspaceId, companyId, runId, uploadedBy } = context;
  const adapter = getAdapter();

  return {
    /**
     * Store a file from a stream, buffer, or base64 string.
     * @param {Stream|Buffer|string} source - readable stream, buffer, or base64 string
     * @param {object} metadata - { name, mimeType, lifecycle }
     * @returns {Promise<object>} fileRef
     */
    async store(source, metadata = {}) {
      const name = metadata.name || 'file';
      const mimeType = metadata.mimeType || 'application/octet-stream';
      const lifecycle = metadata.lifecycle || 'execution';

      let stream;
      let size = 0;

      if (Buffer.isBuffer(source)) {
        size = source.length;
        stream = bufferToStream(source);
      } else if (typeof source === 'string') {
        // Assume base64
        const buf = Buffer.from(source, 'base64');
        size = buf.length;
        stream = bufferToStream(buf);
      } else {
        stream = source;
      }

      const relativePath = makeRelativePath(String(workspaceId), name);
      const result = await adapter.write(relativePath, stream);
      if (result.bytesWritten) size = result.bytesWritten;

      let expiresAt = null;
      if (lifecycle === 'temp') {
        expiresAt = new Date(Date.now() + parseDuration(env.FILE_TTL_DEFAULT));
      }

      const record = await FileRecord.create({
        name,
        mimeType,
        size,
        storage: env.FILE_STORAGE_TYPE === 's3' ? 's3' : 'local',
        storagePath: relativePath,
        lifecycle,
        runId: runId || null,
        workspaceId,
        companyId,
        uploadedBy: uploadedBy || '',
        expiresAt,
      });

      return buildFileRef(record);
    },

    /**
     * Resolve a fileRef, URL, or fileId to a stream + record.
     * Accepts: fileRef object, fileId string, or URL string (http/https).
     */
    async resolve(fileRef) {
      // URL string (from expression mode) → download on the fly
      if (typeof fileRef === 'string' && /^https?:\/\//i.test(fileRef)) {
        return this._resolveUrl(fileRef);
      }
      const fileId = typeof fileRef === 'string' ? fileRef : fileRef?.fileId;
      if (!fileId) throw new Error('Invalid fileRef');
      const record = await FileRecord.findOne({ id: fileId, workspaceId });
      if (!record) throw new Error(`File not found: ${fileId}`);
      const stream = adapter.read(record.storagePath);
      return { stream, record };
    },

    /**
     * Download a URL, store it, and return stream + record.
     */
    async _resolveUrl(url) {
      const http = url.startsWith('https') ? require('https') : require('http');
      return new Promise((resolve, reject) => {
        http.get(url, { headers: { 'User-Agent': 'Homeport/1.0' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return this._resolveUrl(res.headers.location).then(resolve, reject);
          }
          if (res.statusCode >= 400) {
            return reject(new Error(`URL download failed: HTTP ${res.statusCode}`));
          }
          const contentType = res.headers['content-type'] || 'application/octet-stream';
          const urlPath = new URL(url).pathname;
          const name = decodeURIComponent(urlPath.split('/').pop() || 'download');
          const record = { name, mimeType: contentType.split(';')[0].trim(), size: parseInt(res.headers['content-length'] || '0', 10) || 0, _fromUrl: url };
          resolve({ stream: res, record });
        }).on('error', reject);
      });
    },

    /**
     * Convenience: download a URL, store it as a file, and return a fileRef.
     */
    async storeFromUrl(url, metadata = {}) {
      const { stream, record: urlRecord } = await this._resolveUrl(url);
      return this.store(stream, {
        name: metadata.name || urlRecord.name,
        mimeType: metadata.mimeType || urlRecord.mimeType,
        lifecycle: metadata.lifecycle || 'execution',
      });
    },

    /**
     * Resolve a fileRef to a Buffer.
     */
    async resolveAsBuffer(fileRef) {
      const { stream } = await this.resolve(fileRef);
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      return Buffer.concat(chunks);
    },

    /**
     * Resolve a fileRef to a base64 string (rétrocompat).
     */
    async resolveAsBase64(fileRef) {
      const buf = await this.resolveAsBuffer(fileRef);
      return buf.toString('base64');
    },

    /**
     * Remove a file by its fileId.
     */
    async remove(fileIdOrRef) {
      const fileId = typeof fileIdOrRef === 'string' ? fileIdOrRef : fileIdOrRef?.fileId;
      if (!fileId) return;
      const record = await FileRecord.findOne({ id: fileId, workspaceId });
      if (!record) return;
      await adapter.delete(record.storagePath);
      await FileRecord.deleteOne({ _id: record._id });
    },
  };
}

/**
 * Store a file from an upload (used by API routes, not scoped to a run).
 */
async function storeUpload(file, context) {
  const { workspaceId, companyId, uploadedBy, lifecycle } = context;
  const adapter = getAdapter();

  const name = file.originalname || 'upload';
  const mimeType = file.mimetype || 'application/octet-stream';
  const size = file.size || 0;

  const relativePath = makeRelativePath(String(workspaceId), name);
  await adapter.write(relativePath, bufferToStream(file.buffer));

  let expiresAt = null;
  const lc = lifecycle || 'temp';
  if (lc === 'temp') {
    expiresAt = new Date(Date.now() + parseDuration(env.FILE_TTL_DEFAULT));
  }

  const record = await FileRecord.create({
    name,
    mimeType,
    size,
    storage: env.FILE_STORAGE_TYPE === 's3' ? 's3' : 'local',
    storagePath: relativePath,
    lifecycle: lc,
    workspaceId,
    companyId,
    uploadedBy: uploadedBy || '',
    expiresAt,
  });

  return buildFileRef(record);
}

/**
 * Stream-download a file by record.
 */
function readStream(record) {
  const adapter = getAdapter();
  return adapter.read(record.storagePath);
}

/**
 * Delete storage + DB record.
 */
async function removeRecord(record) {
  const adapter = getAdapter();
  await adapter.delete(record.storagePath);
  await FileRecord.deleteOne({ _id: record._id });
}

module.exports = {
  createFilesHelper,
  storeUpload,
  readStream,
  removeRecord,
  parseDuration,
  parseMaxSize,
  getAdapter,
  buildFileRef,
};
