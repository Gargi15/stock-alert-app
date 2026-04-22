import { connectDB } from "./db.js";


/* This is used for the telegram based approach */
export async function getAllUsers() {
    const db = await connectDB();
    const users = await db.collection("users").find().toArray();
    return users;
}

// Returns all users for whom firebase tokens exists.
export async function getUsersForFCM(){
    const db = await connectDB();
        const firebaseUsers = await db.collection("users").find({
            tokens: { $exists: true, $ne: [] }
          }).toArray();
    
          return firebaseUsers

}

/** this function removed invalid/expired tokens from firebase */
export async function removeInvalidToken(userId, token) {
    const db = await connectDB();
  
    await db.collection("users").updateOne(
      { userId },
      { $pull: { tokens: token } }
    );
  
    console.log("🧹 Removed invalid token:", token);
  }