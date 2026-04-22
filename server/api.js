import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import cron from "node-cron";
import { checkMarket } from "./services/marketService.js";
import { getMessagingInstance } from "./firebaseAdmin.js";



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



app.post("/user/link-firebase", async (req, res) => {
    const { firebaseUid, email, existingUserId } = req.body;
  
    const db = await connectDB();
  
    let user = null;
  
    // 1️⃣ Try existing user via your current system
    if (existingUserId) {
      user = await db.collection("users").findOne({ userId: existingUserId });
    }
  
    // 2️⃣ Try via email (future-proofing)
    if (!user && email) {
      user = await db.collection("users").findOne({ email });
    }
  
    // 3️⃣ If no user → create new
    if (!user) {
      const newUser = {
        userId: existingUserId || firebaseUid,
        email,
        firebaseUid,
        tokens: [],
        watchlist: [],
        threshold: 2,
        indices: ["NIFTY", "SENSEX"]
      };
  
      await db.collection("users").insertOne(newUser);
  
      return res.json(newUser);
    }
  
    // 4️⃣ Link Firebase UID to existing user
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
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
          body: "Test notification from your app 🚀",
        },
      });
  
      res.json({ success: true });
    } catch (err) {
      console.error("Notification error:", err);
      res.status(500).json({ error: err.message });
    }
  });