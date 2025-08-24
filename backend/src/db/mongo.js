const mongoose = require('mongoose');
const { EventEmitter } = require('events');
const { MONGO_URL, MONGO_DB_NAME } = require('../db/settings');

const dbEvents = new EventEmitter();
let status = { state: 'idle', url: MONGO_URL, error: null, connectedAt: null };

async function connectMongo(url = MONGO_URL, dbName = MONGO_DB_NAME){
  status = { ...status, state: 'connecting', url, error: null };
  dbEvents.emit('connecting', { url });
  mongoose.connection.on('connected', () => {
    status = { ...status, state: 'connected', connectedAt: Date.now(), error: null };
    dbEvents.emit('connected', { ts: Date.now() });
  });
  mongoose.connection.on('error', (err) => {
    status = { ...status, state: 'error', error: err?.message || String(err) };
    dbEvents.emit('error', { ts: Date.now(), error: status.error });
  });
  mongoose.connection.on('disconnected', () => {
    status = { ...status, state: 'disconnected' };
    dbEvents.emit('disconnected', { ts: Date.now() });
  });
  await mongoose.connect(url, { dbName });
  return mongoose.connection;
}

async function disconnectMongo(){
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

async function withTransaction(fn){
  const session = await mongoose.startSession();
  let ret;
  await session.withTransaction(async () => {
    ret = await fn(session);
  });
  await session.endSession();
  return ret;
}

function getStatus(){ return status; }

module.exports = { connectMongo, disconnectMongo, withTransaction, dbEvents, getStatus };
