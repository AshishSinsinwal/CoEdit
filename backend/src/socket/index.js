import { redisClient } from "../redis/client.js";
import { pubClient, subClient } from "../redis/pubsub.js";
import { Document } from "../documents/document.model.js";
import { Collaborator } from "../documents/collaborator.model.js";

export default function setupSocket(io) {
    subClient.subscribe("document:updates", (message) => {
        const { docId, content } = JSON.parse(message);
        io.to(docId).emit("document:remoteUpdate", { docId, content });
    });

    io.on("connection", (socket) => {
        // ✅ Join personal room for notifications
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
            const redisKey = `doc:${docId}`;
            let content = await redisClient.get(redisKey);
            if (!content) {
                content = "";
                await redisClient.set(redisKey, content);
            }
            socket.emit("document:init", { docId, content });
        });

        socket.on("document:update", async ({ docId, content }) => {
            await redisClient.set(`doc:${docId}`, content);
            await pubClient.publish("document:updates", JSON.stringify({ docId, content }));
        });
    });
}