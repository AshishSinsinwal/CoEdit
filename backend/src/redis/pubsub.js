import {createClient} from 'redis';
import {ENV} from '../config/env.js';

export const pubClient = createClient({
    url: ENV.REDIS_URL
});
export const subClient = createClient({
    url: ENV.REDIS_URL
});

export async function connectPubSub() {
    await pubClient.connect();
    await subClient.connect();
    console.log("PubSub Clients connected successfully");
}