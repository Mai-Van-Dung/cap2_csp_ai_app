let io = null;

const initSocket = (server) => {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

const getIO = () => io;

const broadcastNewAlert = (payload) => {
  if (!io) return false;
  io.emit("new_alert", payload);
  return true;
};

module.exports = {
  initSocket,
  getIO,
  broadcastNewAlert,
};
