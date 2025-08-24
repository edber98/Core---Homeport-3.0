const express = require('express');

module.exports = function(){
  const r = express.Router();
  r.get('/health/db', async (req, res) => {
    if (req.ctx?.useMemory){
      return res.json({ mode: 'memory', state: 'disabled' });
    }
    const { getStatus } = require('../db/mongo');
    return res.json({ mode: 'db', ...getStatus() });
  });

  r.get('/health/db/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    if (req.ctx?.useMemory){
      res.write(`event: state\n`);
      res.write(`data: ${JSON.stringify({ mode: 'memory', state: 'disabled' })}\n\n`);
      return res.end();
    }

    const { dbEvents, getStatus } = require('../db/mongo');
    const send = (type, data) => { res.write(`event: ${type}\n`); res.write(`data: ${JSON.stringify(data)}\n\n`); };

    // send current status
    send('state', getStatus());

    const onConnecting = (e) => send('connecting', e);
    const onConnected = (e) => send('connected', e);
    const onError = (e) => send('error', e);
    const onDisconnected = (e) => send('disconnected', e);

    dbEvents.on('connecting', onConnecting);
    dbEvents.on('connected', onConnected);
    dbEvents.on('error', onError);
    dbEvents.on('disconnected', onDisconnected);

    req.on('close', () => {
      dbEvents.off('connecting', onConnecting);
      dbEvents.off('connected', onConnected);
      dbEvents.off('error', onError);
      dbEvents.off('disconnected', onDisconnected);
    });
  });

  return r;
}

