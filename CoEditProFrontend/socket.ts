
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://coedit-ae4a.onrender.com';

let socket: Socket | null = null;

export const getSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem('token');
  if (!token) return null;

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: {
      token,
    },
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
