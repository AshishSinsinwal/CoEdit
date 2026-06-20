import {createClient} from "redis";
import {ENV} from "../config/env.js";

export const redisClient = createClient({
    url: ENV.REDIS_URL,
    socket: {
        keepAlive: 1000,
    },
});

redisClient.on("error" , (err) => {
    console.log("Redis Client Error", err);
})

export async function connectRedis() {
    if(!redisClient.isOpen) {
        await redisClient.connect();
        console.log("Redis connected successfully");
    }
}