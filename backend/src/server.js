import {createApp} from './app.js';
import {ENV} from './config/env.js';
import {connectRedis} from './redis/client.js';
import {connectPubSub} from './redis/pubsub.js';
import {connectMongo} from './db/mongo.js';
import authRoutes from './auth/auth.routes.js';
import documentRoutes from './documents/document.routes.js';
import express from 'express';
import cors from 'cors';
async function startServer() {
    
    await connectMongo(process.env.MONGO_URI);
    await connectRedis();
    await connectPubSub();

    const { app, server } = createApp();

    app.use(cors({
        origin: process.env.FRONTEND_URL,
        credentials: true
    }));

    app.use(express.json());

    app.use("/auth", authRoutes);
    app.use("/documents", documentRoutes);

    server.listen(ENV.PORT, () => {
        console.log(`Server is running on port ${ENV.PORT}`);
    });
}
startServer();