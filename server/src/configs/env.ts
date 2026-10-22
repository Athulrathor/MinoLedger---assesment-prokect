import { config } from "dotenv";

config();

export const env = {
    port: process.env.PORT,
    db: process.env.POSTGRES_URL,
    jwtSecret: process.env.JWT_SECRET
}