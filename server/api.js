import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import cron from "node-cron";
import { checkMarket } from "./services/marketService.js";
import { getMessagingInstance } from "./firebaseAdmin.js";
import { getNiftyData, getSensexData } from "./stockService.js";


import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/user/:userId", async (req, res) => {
    const db = await connectDB();
    const userId = req.params.userId;


    const user = await db.collection("users").findOne({
        $or: [
          { userId: userId },
          { firebaseUid: userId }
        ]
      });

    res.json(user); // can be null
});

// 🔹 Update watchlist + threshold
app.post("/user/update", async (req, res) => {
    const { userId, watchlist, threshold, email } = req.body;

    if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
    };

    const db = await connectDB();

    await db.collection("users").updateOne(
        { userId: userId },
        { 
            $set: { 
                watchlist, 
                threshold,
                ...(email && { email })
             } ,
            $setOnInsert: {
                indices: ["NIFTY", "SENSEX"]
              }
        },
        
        { upsert: true } // 👈 THIS IS KEY
    );

    res.json({ success: true });
});


app.post("/user/link-firebase", async (req, res) => {
    const { firebaseUid, email } = req.body;
  
    if (!firebaseUid) {
      return res.status(400).json({ error: "Missing firebaseUid" });
    }
  
    const db = await connectDB();
  
    // 1️⃣ Try finding user by firebaseUid
    let user = await db.collection("users").findOne({ firebaseUid });
  
    // 2️⃣ If not found, try by email (merge case)
    if (!user && email) {
      user = await db.collection("users").findOne({ email });
    }
  
    // 3️⃣ If still not found → create new user
    if (!user) {
      const newUser = {
        userId: firebaseUid,   // ✅ ALWAYS firebase UID
        firebaseUid,
        email,
        tokens: [],
        watchlist: [],
        threshold: 2,
        indices: ["NIFTY", "SENSEX"]
      };
  
      await db.collection("users").insertOne(newUser);
  
      return res.json(newUser);
    }
  
    // 4️⃣ If user exists → unify identity
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          userId: firebaseUid,     // ✅ enforce consistency
          firebaseUid,
          email: email || user.email
        }
      }
    );
  
    res.json({ success: true });
  });


  app.post("/user/save-token", async (req, res) => {
    const { firebaseUid, token } = req.body;
  
    const db = await connectDB();
  
    const user = await db.collection("users").findOne({ firebaseUid });
  
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
  
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $addToSet: { tokens: token } // avoids duplicates automatically
      }
    );
  
    res.json({ success: true });
  });

  app.get("/market/summary", async (req, res) => {
    try {
      const nifty = await getNiftyData();
      const sensex = await getSensexData();
  
      const calcChange = (price, prevClose) => {
        return ((price - prevClose) / prevClose) * 100;
      };
  
      res.json({
        nifty: {
          price: nifty.price,
          change: calcChange(nifty.price, nifty.prevClose),
        },
        sensex: {
          price: sensex.price,
          change: calcChange(sensex.price, sensex.prevClose),
        },
      });
    } catch (err) {
      console.error("Summary error:", err.message);
      res.status(500).json({ error: "Failed to fetch summary" });
    }
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



/**
 This URL is for testing firebase notification given a valid firebase token is given
 */
app.post("/test-notification", async (req, res) => {
    const { token } = req.body;
  
    try {
      await getMessagingInstance().send({
        token,
        notification: {
          title: "📈 Stock Alert",
          body: `Token: ${token.slice(-6)}`,
        },
      });
  
      res.json({ success: true });
    } catch (err) {
      console.error("Notification error:", err);
      res.status(500).json({ error: err.message });
    }
  });