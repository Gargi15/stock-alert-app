import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 🔹 Get user (for now hardcode userId)
app.get("/user/:userId", async (req, res) => {
    const db = await connectDB();
    const user = await db.collection("users").findOne({
        userId: req.params.userId
    });

    res.json(user);
});

// 🔹 Update watchlist + threshold
app.post("/user/update", async (req, res) => {
    const { userId, watchlist, threshold } = req.body;

    const db = await connectDB();

    await db.collection("users").updateOne(
        { userId },
        { $set: { watchlist, threshold } }
    );

    res.json({ success: true });
});

app.get("/", (req, res) => {
    res.send("Stock Alert API is running 🚀");
});

app.listen(PORT, () => {
    console.log(`API running on ${PORT}`);
});