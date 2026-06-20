import { redisClient } from "../redis/client.js";
import { pubClient, subClient } from "../redis/pubsub.js";
import { Document } from "../documents/document.model.js";
import { Collaborator } from "../documents/collaborator.model.js";

export default function setupSocket(io) {
    // 1. CATCH DISPATCHED EVENTS FROM REDIS PUB/SUB AND EMIT TO CLIENTS
    subClient.subscribe("document:updates", (message) => {
        const { docId, content, telemetry } = JSON.parse(message);
        io.to(docId).emit("document:remoteUpdate", { docId, content, telemetry });
    });

    // Listen for live presence roster synchronization from Redis across instances
    subClient.subscribe("document:presence", (message) => {
        const { docId, activeMembers } = JSON.parse(message);
        io.to(docId).emit("document:active_presence", { docId, activeMembers });
    });

    // Helper utility to calculate and broadcast active peers
    async function broadcastPresence(docId) {
        const presenceKey = `doc:${docId}:presence`;
        // Fetch snapshot of active user data from Redis Set
        const membersData = await redisClient.sMembers(presenceKey);
        
        const activeMembers = membersData.map(str => JSON.parse(str));

        // Publish to Redis Pub/Sub channel so all socket server nodes hear it
        await pubClient.publish("document:presence", JSON.stringify({ docId, activeMembers }));
    }

    io.on("connection", (socket) => {
        // Join personal room for notifications
        const userId = socket.user.userId;
        socket.join(userId);
        console.log("Socket connected & joined private room:", socket.user.email);

        socket.on("document:join", async ({ docId }) => {
            const currentUserId = socket.user.userId;

            const isOwner = await Document.findOne({ _id: docId, ownerId: currentUserId });
            const isCollaborator = await Collaborator.findOne({ documentId: docId, userId: currentUserId });

            if (!isOwner && !isCollaborator) {
                socket.emit("document:error", "Access denied");
                return;
            }

            socket.join(docId);

            // --- Real-time Presence tracking injection ---
            const presenceKey = `doc:${docId}:presence`;
            const userProfile = {
                id: socket.user.userId,
                _id: socket.user.userId,
                name: socket.user.name || "User",
                email: socket.user.email,
                role: isOwner ? "owner" : "collaborator"
            };
            
            // Atomically add current user profile to Redis Set for this doc
            await redisClient.sAdd(presenceKey, JSON.stringify(userProfile));
            await broadcastPresence(docId);
            // ----------------------------------------------

            const redisKey = `doc:${docId}`;
            let content = await redisClient.get(redisKey);
            if (!content) {
                content = "";
                await redisClient.set(redisKey, content);
            }
            socket.emit("document:init", { docId, content });
        });

        // 2. RECEIVE TELEMETRY FROM CLIENT AND PACKETIZE FOR REDIS
        socket.on("document:update", async ({ docId, content, telemetry }) => {
            await redisClient.set(`doc:${docId}`, content);
            
            // Publish the complete payload containing telemetry to Redis
            await pubClient.publish("document:updates", JSON.stringify({ docId, content, telemetry }));
        });


        // Explicitly handle a user navigating away from the document UI
        socket.on("document:leave", async ({ docId }) => {
            // Unsubscribe this socket from the document's room
            socket.leave(docId);
            
            const presenceKey = `doc:${docId}:presence`;
            const membersData = await redisClient.sMembers(presenceKey);
            
            // Find and remove this user from the active roster
            const entryToRemove = membersData.find(str => {
                const parsed = JSON.parse(str);
                return parsed._id === userId;
            });

            if (entryToRemove) {
                await redisClient.sRem(presenceKey, entryToRemove);
                // Tell everyone else in the room that this user left
                await broadcastPresence(docId);
            }
        });


        // Automatically catch whenever a user disconnects or closes their tab
        socket.on("disconnecting", async () => {
            // Read every room this socket was explicitly joined to (excluding its own private room & socket id)
            const activeRooms = Array.from(socket.rooms).filter(room => room !== socket.id && room !== userId);
            
            for (const docId of activeRooms) {
                const presenceKey = `doc:${docId}:presence`;
                const membersData = await redisClient.sMembers(presenceKey);
                
                // Identify matching entry by extracting string objects
                const entryToRemove = membersData.find(str => {
                    const parsed = JSON.parse(str);
                    return parsed._id === userId;
                });

                if (entryToRemove) {
                    await redisClient.sRem(presenceKey, entryToRemove);
                    await broadcastPresence(docId);
                }
            }
        });
    });
}