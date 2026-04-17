import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri);

let db;

export async function connectDB() {
    if (!db) {
        await client.connect();
        db = client.db("stock-alerts");
        console.log("MongoDB connected");
    }
    return db;
}