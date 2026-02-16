const { Readable } = require('stream');

class S3Adapter {
  constructor(config) {
    this.bucket = config.bucket;
    this._config = config;
    this._client = null;
  }

  async _getClient() {
    if (this._client) return this._client;
    const { S3Client } = require('@aws-sdk/client-s3');
    const opts = { region: this._config.region };
    if (this._config.accessKey && this._config.secretKey) {
      opts.credentials = { accessKeyId: this._config.accessKey, secretAccessKey: this._config.secretKey };
    }
    if (this._config.endpoint) {
      opts.endpoint = this._config.endpoint;
      opts.forcePathStyle = true;
    }
    this._client = new S3Client(opts);
    return this._client;
  }

  async write(relativePath, readableStream) {
    const client = await this._getClient();
    const { Upload } = require('@aws-sdk/lib-storage');
    const upload = new Upload({
      client,
      params: { Bucket: this.bucket, Key: relativePath, Body: readableStream },
    });
    const result = await upload.done();
    return { bytesWritten: result.ContentLength || 0 };
  }

  async read(relativePath) {
    const client = await this._getClient();
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const res = await client.send(new GetObjectCommand({ Bucket: this.bucket, Key: relativePath }));
    return res.Body;
  }

  async delete(relativePath) {
    const client = await this._getClient();
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: relativePath }));
  }

  async exists(relativePath) {
    const client = await this._getClient();
    const { HeadObjectCommand } = require('@aws-sdk/client-s3');
    try {
      await client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: relativePath }));
      return true;
    } catch { return false; }
  }
}

module.exports = S3Adapter;
