import { connectDB } from "./db.js";

const COLLECTION = "alert_state";

export async function getState(index) {
    const db = await connectDB();
    const collection = db.collection(COLLECTION);

    const state = await collection.findOne({ index });

    return state?.lastAlertState || false;
}

export async function setState(index, value) {
    const db = await connectDB();
    const collection = db.collection(COLLECTION);

    await collection.updateOne(
        { index },
        { $set: { lastAlertState: value } },
        { upsert: true }
    );
}