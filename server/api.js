import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import cron from "node-cron";
import { checkMarket } from "./services/marketService.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/user/:userId", async (req, res) => {
    const db = await connectDB();
    const userId = req.params.userId;

    const user = await db.collection("users").findOne({ userId });

    res.json(user); // can be null
});

// 🔹 Update watchlist + threshold
app.post("/user/update", async (req, res) => {
    const { userId, watchlist, threshold } = req.body;

    const db = await connectDB();

    await db.collection("users").updateOne(
        { userId },
        { 
            $set: { watchlist, threshold } ,
            $setOnInsert: {
                indices: ["NIFTY", "SENSEX"]
              }
        },
        
        { upsert: true } // 👈 THIS IS KEY
    );

    res.json({ success: true });
});

app.get("/", (req, res) => {
    res.send("Stock Alert API is running 🚀");
});

app.listen(PORT, () => {
    console.log(`API running on ${PORT}`);
});

cron.schedule("* * * * *", () => {
    console.log("⏱️ Cron running...");
    checkMarket();
  });