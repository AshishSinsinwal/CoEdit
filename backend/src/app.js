import express from 'express';
import http from 'http';
import  {Server} from 'socket.io';
import setupSocketIO from './socket/index.js';
import { socketAuthMiddleware } from './socket/auth.middleware.js';


export function createApp() {
    const app = express();
    const server = http.createServer(app);

    const io = new Server(server, {
        cors: {
            origin: "*",
        }
    });
    app.set('socketio', io);
    io.use(socketAuthMiddleware);
    setupSocketIO(io);
    return {app, server};
}
