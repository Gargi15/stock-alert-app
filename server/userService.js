import { connectDB } from "./db.js";

export async function getAllUsers() {
    const db = await connectDB();
    const users = await db.collection("users").find().toArray();
    return users;
}