const mongoose = require('mongoose');
const { SubscriptionTrigger } = require('../subscription-trigger');

class MongoDBAdapter extends SubscriptionTrigger {
  async _connect() {
    const ctx = this.eventNode?.model?.context || this.eventNode?.data?.model?.context || {};
    const collection = ctx.collection;
    const database = ctx.database || null;
    const operations = ctx.operations || ['insert', 'update', 'replace', 'delete'];

    if (!collection) throw new Error('Missing collection name');

    const db = database
      ? mongoose.connection.client.db(database)
      : mongoose.connection.db;

    const col = db.collection(collection);

    const pipeline = [
      { $match: { operationType: { $in: operations } } }
    ];

    const opts = { fullDocument: 'updateLookup' };
    if (this._resumeToken) opts.resumeAfter = this._resumeToken;

    this.changeStream = col.watch(pipeline, opts);

    this.changeStream.on('change', async (change) => {
      this._resumeToken = change._id;
      await this._emit({
        operationType: change.operationType,
        collection: change.ns?.coll,
        documentKey: change.documentKey,
        fullDocument: change.fullDocument || null,
        updateDescription: change.updateDescription || null,
      });
    });

    this.changeStream.on('error', (err) => {
      this.lastError = err.message;
      this.log.error(`[mongodb] change stream error: ${err.message}`);
      if (this.active) {
        setTimeout(() => this._reconnect(), 5000);
      }
    });

    this.log.info(`[mongodb] watching ${collection} for [${operations.join(',')}]`);
  }

  async _reconnect() {
    if (!this.active) return;
    try { await this._disconnect(); } catch {}
    try {
      await this._connect();
    } catch (e) {
      this.lastError = e.message;
      setTimeout(() => this._reconnect(), 30000);
    }
  }

  async _disconnect() {
    if (this.changeStream) {
      try { await this.changeStream.close(); } catch {}
      this.changeStream = null;
    }
  }
}

module.exports = { MongoDBAdapter };
