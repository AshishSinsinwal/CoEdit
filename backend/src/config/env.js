import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
    PORT : process.env.PORT || 5000,
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
}