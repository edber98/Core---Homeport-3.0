const { Server } = (() => { try { return require('socket.io'); } catch { return { Server: null }; } })();

let io = null;

function attach(server){
  if (!Server) return null;
  io = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });
  io.on('connection', (socket) => {
    socket.on('subscribe:run', ({ runId }) => { try { socket.join(`run:${runId}`); } catch {} });
    socket.on('unsubscribe:run', ({ runId }) => { try { socket.leave(`run:${runId}`); } catch {} });
  });
  return io;
}

function broadcastRun(runId, event){
  if (!io) return;
  try { io.to(`run:${runId}`).emit('run:event', event); } catch {}
}

module.exports = { attach, broadcastRun };

